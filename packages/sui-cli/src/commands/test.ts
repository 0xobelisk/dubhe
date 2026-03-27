import type { CommandModule } from 'yargs';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { DubheConfig, loadConfig } from '@0xobelisk/sui-common';
import { SuiClient, getFullnodeUrl, type SuiObjectResponse } from '@mysten/sui/client';
import chalk from 'chalk';
import { handlerExit } from './shell';
import {
  filterForkDiffIgnoredObjects,
  formatForkDriftDetails,
  formatForkIgnoreSummary,
  hasForkDrift,
  parseForkIgnoreObjectIds,
  parseForkFixtureManifest,
  resolveForkSnapshotPath
} from './forkUtils';
import {
  ObjectSnapshot,
  SnapshotEntry,
  diffSnapshotEntries,
  formatSnapshotDiffSummary
} from './snapshotUtils';
import {
  buildGasModuleHotspots,
  buildGasRegressionHotspots,
  buildGasProfileReport,
  compareGasAgainstBaseline,
  formatGasModuleHotspotSummary,
  formatGasStatisticsSummary,
  formatGasRegressionSummary,
  parseGasStatisticsCsv,
  readGasProfileReport,
  renderGasFlamegraphSvg,
  renderGasProfileHtml,
  resolveStatisticsMode,
  writeGasProfileReport
} from './testProfiling';

/**
 * Returns the active Sui client environment (e.g. "localnet", "testnet").
 * Falls back to "testnet" if the command fails.
 */
function getActiveSuiEnv(): string {
  try {
    return execSync('sui client active-env', { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch {
    return 'testnet';
  }
}

const MULTI_GET_OBJECTS_BATCH_SIZE = 50;

type Options = {
  'config-path': string;
  test?: string;
  'gas-limit'?: string;
  trace?: boolean;
  statistics?: string;
  'expect-failure'?: boolean;
  'expect-failure-pattern'?: string;
  'expect-abort-code'?: number;
  'fork-fixture'?: string;
  'fork-diff-out'?: string;
  'fork-current-snapshot-out'?: string;
  'fork-fail-on-drift'?: boolean;
  'fork-max-drift-lines'?: number;
  'fork-ignore-objects'?: string;
  'fork-ignore-objects-file'?: string;
  'profile-gas'?: boolean;
  'profile-top'?: number;
  'profile-module-top'?: number;
  'profile-out'?: string;
  'profile-html-out'?: string;
  'profile-html-title'?: string;
  'profile-flamegraph-out'?: string;
  'profile-flamegraph-title'?: string;
  'profile-flamegraph-max-modules'?: number;
  'profile-flamegraph-max-tests-per-module'?: number;
  'profile-baseline'?: string;
  'profile-regression-out'?: string;
  'profile-threshold-pct'?: number;
  'profile-fail-on-regression'?: boolean;
  'update-profile-baseline'?: boolean;
  debug?: boolean;
};

type TestRunOptions = {
  trace?: boolean;
  statistics?: 'text' | 'csv';
  debug?: boolean;
};

export type TestFailureExpectation = {
  pattern?: string;
  abortCode?: number;
};

function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeOwner(owner: unknown): string | undefined {
  if (owner == null) return undefined;
  if (typeof owner === 'string') return owner;
  return toText(owner);
}

function normalizeSnapshotEntry(objectId: string, response: SuiObjectResponse): SnapshotEntry {
  if (response.error) {
    return {
      objectId,
      version: '-',
      digest: '-',
      status: 'error',
      error: toText(response.error)
    };
  }

  const data = response.data;
  if (!data) {
    return {
      objectId,
      version: '-',
      digest: '-',
      status: 'error',
      error: 'Object data missing in RPC response'
    };
  }

  return {
    objectId: data.objectId ?? objectId,
    version: `${data.version}`,
    digest: data.digest ?? '-',
    type: data.type ?? undefined,
    owner: normalizeOwner(data.owner),
    previousTransaction: data.previousTransaction ?? undefined,
    storageRebate: data.storageRebate != null ? `${data.storageRebate}` : undefined,
    status: 'found'
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function parseForkIgnoreObjectIdsFile(filePath: string): string[] {
  return fs
    .readFileSync(filePath, 'utf-8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

async function captureObjectSnapshot(
  client: SuiClient,
  objectIds: string[],
  network: string,
  rpcUrl: string
): Promise<ObjectSnapshot> {
  const entries: SnapshotEntry[] = [];
  const groups = chunk(objectIds, MULTI_GET_OBJECTS_BATCH_SIZE);

  for (const ids of groups) {
    const responses = await client.multiGetObjects({
      ids,
      options: {
        showType: true,
        showOwner: true,
        showPreviousTransaction: true,
        showStorageRebate: true
      }
    });

    for (let responseIndex = 0; responseIndex < ids.length; responseIndex++) {
      const objectId = ids[responseIndex];
      const response = responses[responseIndex];
      if (!response) {
        entries.push({
          objectId,
          version: '-',
          digest: '-',
          status: 'error',
          error: 'Object response missing in RPC batch result'
        });
        continue;
      }
      entries.push(normalizeSnapshotEntry(objectId, response));
    }
  }

  entries.sort((a, b) => a.objectId.localeCompare(b.objectId));
  return {
    generatedAt: new Date().toISOString(),
    network,
    rpcUrl,
    entries
  };
}

function readObjectSnapshotFile(filePath: string): ObjectSnapshot {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as ObjectSnapshot;
  if (!Array.isArray(parsed.entries)) {
    throw new Error(`Invalid snapshot file (missing entries array): ${filePath}`);
  }
  return parsed;
}

export function outputContainsAbortCode(output: string, abortCode: number): boolean {
  const patterns = [
    new RegExp(`\\bwith\\s+code\\s+${abortCode}\\b`),
    new RegExp(`\\babort_code\\s*=\\s*${abortCode}\\b`),
    new RegExp(`\\babort\\s+${abortCode}\\b`)
  ];
  return patterns.some((pattern) => pattern.test(output));
}

export function matchesExpectedTestFailure(
  output: string,
  expectation: TestFailureExpectation
): { ok: boolean; reason?: string } {
  if (expectation.pattern) {
    const pattern = expectation.pattern.trim();
    if (pattern.length > 0 && !output.toLowerCase().includes(pattern.toLowerCase())) {
      return { ok: false, reason: `Expected failure pattern not found: "${pattern}"` };
    }
  }

  if (typeof expectation.abortCode === 'number') {
    if (!outputContainsAbortCode(output, expectation.abortCode)) {
      return {
        ok: false,
        reason: `Expected abort code not found in output: ${expectation.abortCode}`
      };
    }
  }

  return { ok: true };
}

/**
 * Core Move test runner for Dubhe contracts.
 * Runs `sui move test` against the package at `src/<dubheConfig.name>`.
 *
 * Move unit tests compile packages locally — no network or published address required.
 */
export async function testHandler(
  dubheConfig: DubheConfig,
  test?: string,
  gasLimit: string = '100000000',
  buildEnv?: string,
  options?: TestRunOptions
): Promise<string> {
  const cwd = process.cwd();
  const projectPath = `${cwd}/src/${dubheConfig.name}`;
  const args = ['sui move test'];

  // --build-env overrides the active Sui client environment for dependency resolution.
  // Required for localnet (which is not in Move.toml [environments]) when the
  // active client env has been set to localnet from a previous run.
  if (buildEnv) args.push(`--build-env ${buildEnv}`);
  args.push(`--path ${projectPath}`);
  if (test) args.push(`--test ${test}`);
  args.push(`--gas-limit ${gasLimit}`);
  if (options?.trace) args.push('--trace');

  if (options?.statistics === 'text') {
    args.push('--statistics');
  } else if (options?.statistics === 'csv') {
    args.push('--statistics csv');
  }

  const command = args.join(' ');
  if (options?.debug) {
    console.log(chalk.gray(`[debug] command=${command}`));
  }

  return execSync(command, { stdio: 'pipe', encoding: 'utf-8' });
}

const commandModule: CommandModule<Options, Options> = {
  command: 'test',

  describe: 'Run Move unit tests in Dubhe contracts',

  builder(yargs) {
    return yargs.options({
      'config-path': {
        type: 'string',
        default: 'dubhe.config.ts',
        description: 'Path to the Dubhe config file'
      },
      test: {
        type: 'string',
        desc: 'Run a specific test by name'
      },
      'gas-limit': {
        type: 'string',
        desc: 'Set the gas limit for the test',
        default: '100000000'
      },
      trace: {
        type: 'boolean',
        default: false,
        desc: 'Enable Move VM trace output'
      },
      statistics: {
        type: 'string',
        choices: ['text', 'csv'],
        desc: 'Enable Move test statistics output (text or csv)'
      },
      'expect-failure': {
        type: 'boolean',
        default: false,
        desc: 'Treat this run as expected-to-fail (expectRevert-style CLI behavior)'
      },
      'expect-failure-pattern': {
        type: 'string',
        desc: 'Require failure output to contain this pattern (case-insensitive)'
      },
      'expect-abort-code': {
        type: 'number',
        desc: 'Require failure output to include this Move abort code'
      },
      'fork-fixture': {
        type: 'string',
        desc: 'Fork fixture manifest JSON generated by `dubhe snapshot --fork-fixture-out`'
      },
      'fork-diff-out': {
        type: 'string',
        desc: 'Write fork drift diff JSON artifact to this file'
      },
      'fork-current-snapshot-out': {
        type: 'string',
        desc: 'Write current fork snapshot JSON to this file before test execution'
      },
      'fork-fail-on-drift': {
        type: 'boolean',
        default: true,
        desc: 'Exit non-zero if fork fixture drift is detected before test execution'
      },
      'fork-max-drift-lines': {
        type: 'number',
        default: 20,
        desc: 'Maximum drift detail lines printed in console summary'
      },
      'fork-ignore-objects': {
        type: 'string',
        desc: 'Comma/space-separated object IDs ignored from fork drift checks'
      },
      'fork-ignore-objects-file': {
        type: 'string',
        desc: 'File listing object IDs ignored from fork drift checks (one per line)'
      },
      'profile-gas': {
        type: 'boolean',
        default: false,
        desc: 'Enable gas profiling summary (forces --statistics csv)'
      },
      'profile-top': {
        type: 'number',
        default: 10,
        desc: 'Top N tests by gas in profiling summary'
      },
      'profile-module-top': {
        type: 'number',
        default: 10,
        desc: 'Top N module hotspots by total gas'
      },
      'profile-out': {
        type: 'string',
        desc: 'Write parsed gas profile JSON report to this file'
      },
      'profile-html-out': {
        type: 'string',
        desc: 'Write HTML gas profiling report (heat-map style) to this file'
      },
      'profile-html-title': {
        type: 'string',
        default: 'Dubhe Gas Profile',
        desc: 'Title used in --profile-html-out report'
      },
      'profile-flamegraph-out': {
        type: 'string',
        desc: 'Write SVG flamegraph-style gas report to this file'
      },
      'profile-flamegraph-title': {
        type: 'string',
        default: 'Dubhe Gas Flamegraph',
        desc: 'Title used in --profile-flamegraph-out report'
      },
      'profile-flamegraph-max-modules': {
        type: 'number',
        default: 12,
        desc: 'Max modules shown in flamegraph module row'
      },
      'profile-flamegraph-max-tests-per-module': {
        type: 'number',
        default: 10,
        desc: 'Max tests shown per module in flamegraph test row'
      },
      'profile-baseline': {
        type: 'string',
        desc: 'Path to baseline gas profile JSON for regression check'
      },
      'profile-regression-out': {
        type: 'string',
        desc: 'Write baseline comparison + hotspot diagnostics JSON to this file'
      },
      'profile-threshold-pct': {
        type: 'number',
        default: 5,
        desc: 'Fail when gas increase exceeds this percentage vs baseline'
      },
      'profile-fail-on-regression': {
        type: 'boolean',
        default: true,
        desc: 'Exit non-zero if baseline regressions are detected'
      },
      'update-profile-baseline': {
        type: 'boolean',
        default: false,
        desc: 'Overwrite baseline file with current profiling result after run'
      },
      debug: {
        type: 'boolean',
        default: false,
        desc: 'Print debug execution details'
      }
    });
  },

  async handler({
    'config-path': configPath,
    test,
    'gas-limit': gasLimit,
    trace,
    statistics,
    'expect-failure': expectFailure,
    'expect-failure-pattern': expectFailurePattern,
    'expect-abort-code': expectAbortCode,
    'fork-fixture': forkFixture,
    'fork-diff-out': forkDiffOut,
    'fork-current-snapshot-out': forkCurrentSnapshotOut,
    'fork-fail-on-drift': forkFailOnDrift,
    'fork-max-drift-lines': forkMaxDriftLines,
    'fork-ignore-objects': forkIgnoreObjects,
    'fork-ignore-objects-file': forkIgnoreObjectsFile,
    'profile-gas': profileGas,
    'profile-top': profileTop,
    'profile-module-top': profileModuleTop,
    'profile-out': profileOut,
    'profile-html-out': profileHtmlOut,
    'profile-html-title': profileHtmlTitle,
    'profile-flamegraph-out': profileFlamegraphOut,
    'profile-flamegraph-title': profileFlamegraphTitle,
    'profile-flamegraph-max-modules': profileFlamegraphMaxModules,
    'profile-flamegraph-max-tests-per-module': profileFlamegraphMaxTestsPerModule,
    'profile-baseline': profileBaseline,
    'profile-regression-out': profileRegressionOut,
    'profile-threshold-pct': profileThresholdPct,
    'profile-fail-on-regression': profileFailOnRegression,
    'update-profile-baseline': updateProfileBaseline,
    debug
  }) {
    try {
      console.log('🚀 Running move test');
      const dubheConfig = (await loadConfig(configPath)) as DubheConfig;

      // Ephemeral networks (localnet/devnet) are not defined in Move.toml [environments].
      // Use --build-env testnet for dependency resolution so `sui move test` can resolve
      // git dependencies without requiring a localnet env entry.
      const activeEnv = getActiveSuiEnv();
      const buildEnv = activeEnv === 'localnet' || activeEnv === 'devnet' ? 'testnet' : undefined;
      const normalizedStatistics =
        statistics === 'text' || statistics === 'csv' ? statistics : undefined;
      const resolvedStatistics = resolveStatisticsMode(normalizedStatistics, profileGas);

      if (forkFixture) {
        const manifestPayload = JSON.parse(fs.readFileSync(forkFixture, 'utf-8'));
        const manifest = parseForkFixtureManifest(manifestPayload);
        const fixtureSnapshotPath = resolveForkSnapshotPath(forkFixture, manifest.snapshotFile);
        const fixtureSnapshot = readObjectSnapshotFile(fixtureSnapshotPath);
        const rpcUrl = manifest.rpcUrl || getFullnodeUrl(manifest.network);
        const client = new SuiClient({ url: rpcUrl });
        const currentSnapshot = await captureObjectSnapshot(
          client,
          manifest.objectIds,
          manifest.network,
          rpcUrl
        );
        const ignoreList = parseForkIgnoreObjectIds([
          forkIgnoreObjects || '',
          ...(forkIgnoreObjectsFile ? parseForkIgnoreObjectIdsFile(forkIgnoreObjectsFile) : [])
        ]);
        const rawDiff = diffSnapshotEntries(fixtureSnapshot.entries, currentSnapshot.entries);
        const diff = filterForkDiffIgnoredObjects(rawDiff, ignoreList);

        console.log(
          chalk.blue(
            `Fork fixture check (${manifest.name || path.basename(forkFixture)}): ${
              manifest.network
            } ${rpcUrl ? `(${rpcUrl})` : ''}`
          )
        );
        if (ignoreList.length > 0) {
          process.stdout.write(`${formatForkIgnoreSummary(rawDiff, diff, ignoreList)}\n`);
        }
        process.stdout.write(`${formatSnapshotDiffSummary(diff)}\n`);
        process.stdout.write(
          `${formatForkDriftDetails(diff, Math.max(1, Math.floor(forkMaxDriftLines ?? 20)))}\n`
        );

        if (forkCurrentSnapshotOut) {
          fs.mkdirSync(path.dirname(forkCurrentSnapshotOut), { recursive: true });
          fs.writeFileSync(
            forkCurrentSnapshotOut,
            JSON.stringify(currentSnapshot, null, 2),
            'utf-8'
          );
          console.log(chalk.green(`Fork current snapshot written to: ${forkCurrentSnapshotOut}`));
        }

        if (forkDiffOut) {
          fs.mkdirSync(path.dirname(forkDiffOut), { recursive: true });
          fs.writeFileSync(
            forkDiffOut,
            JSON.stringify(
              {
                generatedAt: new Date().toISOString(),
                fixture: forkFixture,
                snapshotFile: fixtureSnapshotPath,
                network: manifest.network,
                rpcUrl,
                ignoredObjectIds: ignoreList,
                rawDiff,
                diff
              },
              null,
              2
            ),
            'utf-8'
          );
          console.log(chalk.green(`Fork drift diff written to: ${forkDiffOut}`));
        }

        if ((forkFailOnDrift ?? true) && hasForkDrift(diff)) {
          throw new Error('Fork fixture drift detected before test run');
        }
      }

      let output = '';
      let testFailed = false;
      try {
        output = await testHandler(dubheConfig, test, gasLimit, buildEnv, {
          trace,
          statistics: resolvedStatistics,
          debug
        });
        if (output) process.stdout.write(output);
      } catch (error: any) {
        testFailed = true;
        output = `${error?.stdout || ''}${error?.stderr || ''}`;
        if (output) process.stdout.write(output);
      }

      const expectingFailure =
        (expectFailure ?? false) ||
        typeof expectFailurePattern === 'string' ||
        typeof expectAbortCode === 'number';
      if (expectingFailure) {
        if (!testFailed) {
          throw new Error('Expected test failure, but test command succeeded');
        }
        const expectationCheck = matchesExpectedTestFailure(output, {
          pattern: expectFailurePattern,
          abortCode: expectAbortCode
        });
        if (!expectationCheck.ok) {
          throw new Error(expectationCheck.reason || 'Expected failure did not match');
        }
        console.log(chalk.green('Expected failure matched (expectRevert-style check passed)'));
        handlerExit();
        return;
      }

      if (testFailed) {
        throw new Error('Move test execution failed');
      }

      if (resolvedStatistics === 'csv' && profileGas) {
        const rows = parseGasStatisticsCsv(output);
        const top = Math.max(1, Math.floor(profileTop ?? 10));
        const summary = formatGasStatisticsSummary(rows, top);
        process.stdout.write(`${summary}\n`);
        const moduleTop = Math.max(1, Math.floor(profileModuleTop ?? 10));
        process.stdout.write(`${formatGasModuleHotspotSummary(rows, moduleTop)}\n`);
        const report = buildGasProfileReport(rows, top);
        const moduleHotspots = buildGasModuleHotspots(rows);
        let baselineComparison: ReturnType<typeof compareGasAgainstBaseline> | undefined;

        if (profileOut) {
          writeGasProfileReport(profileOut, report);
          console.log(chalk.green(`Gas profile report written to: ${profileOut}`));
        }

        if (profileBaseline) {
          let baselineRows:
            | {
                name: string;
                nanos: number;
                gas: number;
              }[]
            | undefined;

          try {
            const baselineReport = readGasProfileReport(profileBaseline);
            baselineRows = baselineReport.rows;
          } catch (error) {
            if (!updateProfileBaseline) throw error;
            console.log(
              chalk.yellow(
                `Baseline not found/readable, will initialize it from current run: ${profileBaseline}`
              )
            );
          }

          if (baselineRows) {
            const threshold = Number(profileThresholdPct ?? 5);
            const comparison = compareGasAgainstBaseline(rows, baselineRows, threshold);
            baselineComparison = comparison;
            process.stdout.write(`${formatGasRegressionSummary(comparison, top)}\n`);

            if ((profileFailOnRegression ?? true) && comparison.regressions.length > 0) {
              throw new Error(
                `Gas regression detected: ${comparison.regressions.length} tests exceeded ${threshold}% threshold`
              );
            }
          }

          if (updateProfileBaseline) {
            writeGasProfileReport(profileBaseline, report);
            console.log(chalk.green(`Gas baseline updated: ${profileBaseline}`));
          }
        }

        if (profileRegressionOut) {
          const thresholdPct = Number(profileThresholdPct ?? 5);
          const payload = {
            generatedAt: new Date().toISOString(),
            thresholdPct,
            profileReport: report,
            moduleHotspots,
            regressionHotspots: baselineComparison
              ? buildGasRegressionHotspots(baselineComparison.regressions)
              : [],
            baselineComparison
          };
          fs.mkdirSync(path.dirname(profileRegressionOut), { recursive: true });
          fs.writeFileSync(profileRegressionOut, JSON.stringify(payload, null, 2), 'utf-8');
          console.log(chalk.green(`Gas regression report written to: ${profileRegressionOut}`));
        }

        if (profileHtmlOut) {
          const html = renderGasProfileHtml(report, {
            title: profileHtmlTitle,
            comparison: baselineComparison,
            moduleHotspots
          });
          fs.mkdirSync(path.dirname(profileHtmlOut), { recursive: true });
          fs.writeFileSync(profileHtmlOut, html, 'utf-8');
          console.log(chalk.green(`Gas HTML report written to: ${profileHtmlOut}`));
        }

        if (profileFlamegraphOut) {
          const flamegraph = renderGasFlamegraphSvg(report, {
            title: profileFlamegraphTitle,
            maxModules: profileFlamegraphMaxModules,
            maxTestsPerModule: profileFlamegraphMaxTestsPerModule
          });
          fs.mkdirSync(path.dirname(profileFlamegraphOut), { recursive: true });
          fs.writeFileSync(profileFlamegraphOut, flamegraph, 'utf-8');
          console.log(chalk.green(`Gas flamegraph SVG written to: ${profileFlamegraphOut}`));
        }
      }
    } catch (error: any) {
      if (error.stdout) process.stdout.write(error.stdout);
      if (error.stderr) process.stderr.write(error.stderr);
      if (!error.stdout && !error.stderr && error.message) process.stderr.write(error.message);
      handlerExit(1);
    }
    handlerExit();
  }
};

export default commandModule;
