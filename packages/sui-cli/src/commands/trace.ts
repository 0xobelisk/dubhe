import type { CommandModule } from 'yargs';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import {
  DryRunTransactionBlockResponse,
  SuiClient,
  SuiTransactionBlockResponse,
  getFullnodeUrl
} from '@mysten/sui/client';
import { getDefaultNetwork, logError } from '../utils';
import { handlerExit } from './shell';
import { formatDryRunOutput, formatTraceOutput } from './traceFormatter';
import {
  buildForkReplayErrorCheck,
  compareForkReplay,
  hasForkReplayMismatch,
  summarizeForkReplayReport,
  type ForkReplayReport
} from './forkReplayUtils';
import {
  renderTraceCallGraphJson,
  renderTraceCallGraphMermaid,
  renderTraceHtml,
  renderTraceMarkdown,
  renderTraceReplayShellScript,
  type TraceReportEntry
} from './traceReport';

type Options = {
  digest?: string;
  'digest-file'?: string;
  network: any;
  'rpc-url'?: string;
  json?: boolean;
  debug?: boolean;
  replay?: boolean;
  'replay-json'?: boolean;
  'show-inputs'?: boolean;
  'continue-on-error'?: boolean;
  'max-calls'?: number;
  'max-events'?: number;
  'max-object-changes'?: number;
  'max-balance-changes'?: number;
  'call-filter'?: string;
  'call-detail-index'?: number;
  'md-out'?: string;
  'html-out'?: string;
  'call-graph-out'?: string;
  'call-graph-json-out'?: string;
  'call-graph-title'?: string;
  'replay-script-out'?: string;
  'consistency-out'?: string;
  'consistency-gas-tolerance-pct'?: number;
  'consistency-max-rows'?: number;
  'fail-on-consistency-mismatch'?: boolean;
  'report-title'?: string;
};

type TraceRunOptions = {
  json?: boolean;
  debug?: boolean;
  replay?: boolean;
  replayJson?: boolean;
  showInputs?: boolean;
  maxCalls?: number;
  maxEvents?: number;
  maxObjectChanges?: number;
  maxBalanceChanges?: number;
  callFilter?: string;
  callDetailIndex?: number;
};

async function traceOneDigest(
  client: SuiClient,
  digest: string,
  network: string,
  options: TraceRunOptions
): Promise<{
  trace: SuiTransactionBlockResponse;
  dryRun?: DryRunTransactionBlockResponse;
}> {
  const request = {
    digest,
    options: {
      showInput: true,
      showRawInput: options.replay,
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
      showBalanceChanges: true
    }
  };

  if (options.debug) {
    console.log(chalk.gray(`[debug] network=${network}`));
    console.log(chalk.gray(`[debug] request=${JSON.stringify(request)}`));
  }

  const response = await client.getTransactionBlock(request);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
  } else {
    const formatted = formatTraceOutput(response, {
      maxCalls: options.maxCalls,
      maxEvents: options.maxEvents,
      maxObjectChanges: options.maxObjectChanges,
      maxBalanceChanges: options.maxBalanceChanges,
      showInputs: options.showInputs,
      callFilter: options.callFilter,
      callDetailIndex: options.callDetailIndex
    });
    process.stdout.write(`${formatted}\n`);
  }

  let dryRunResponse: DryRunTransactionBlockResponse | undefined;
  if (options.replay) {
    const rawTransaction = response.rawTransaction;
    if (!rawTransaction) {
      throw new Error('Cannot replay: raw transaction bytes are unavailable from RPC response');
    }

    if (options.debug) {
      console.log(chalk.gray(`[debug] replayRawBytesLength=${rawTransaction.length}`));
    }

    dryRunResponse = await client.dryRunTransactionBlock({
      transactionBlock: rawTransaction
    });

    if (options.replayJson) {
      process.stdout.write(`${JSON.stringify(dryRunResponse, null, 2)}\n`);
    } else {
      process.stdout.write('\nReplay Dry-Run:\n');
      const replayOutput = formatDryRunOutput(dryRunResponse, {
        maxCalls: options.maxCalls,
        maxEvents: options.maxEvents,
        maxObjectChanges: options.maxObjectChanges,
        maxBalanceChanges: options.maxBalanceChanges,
        showInputs: options.showInputs,
        callFilter: options.callFilter,
        callDetailIndex: options.callDetailIndex
      });
      process.stdout.write(`${replayOutput}\n`);
    }
  }

  return {
    trace: response,
    dryRun: dryRunResponse
  };
}

const commandModule: CommandModule<Options, Options> = {
  command: 'trace',
  describe: 'Trace a transaction digest with human-readable execution summary',
  builder(yargs) {
    return yargs.options({
      digest: {
        type: 'string',
        desc: 'Transaction digest to inspect'
      },
      'digest-file': {
        type: 'string',
        desc: 'Read transaction digests from file (one digest per line)'
      },
      network: {
        type: 'string',
        choices: ['mainnet', 'testnet', 'devnet', 'localnet', 'default'],
        default: 'default',
        desc: 'Node network (mainnet/testnet/devnet/localnet)'
      },
      'rpc-url': {
        type: 'string',
        desc: 'Optional RPC URL override'
      },
      json: {
        type: 'boolean',
        default: false,
        desc: 'Print raw transaction JSON instead of formatted trace'
      },
      debug: {
        type: 'boolean',
        default: false,
        desc: 'Print RPC request metadata for audit/debug'
      },
      replay: {
        type: 'boolean',
        default: false,
        desc: 'Replay fetched transaction bytes with dry-run and print another trace'
      },
      'replay-json': {
        type: 'boolean',
        default: false,
        desc: 'Print raw dry-run response JSON when --replay is enabled'
      },
      'show-inputs': {
        type: 'boolean',
        default: false,
        desc: 'Print programmable transaction input arguments in trace output'
      },
      'continue-on-error': {
        type: 'boolean',
        default: false,
        desc: 'Continue tracing remaining digests if one digest fails'
      },
      'max-calls': {
        type: 'number',
        default: 12,
        desc: 'Max programmable calls to print'
      },
      'max-events': {
        type: 'number',
        default: 10,
        desc: 'Max events to print'
      },
      'max-object-changes': {
        type: 'number',
        default: 20,
        desc: 'Max object changes to print'
      },
      'max-balance-changes': {
        type: 'number',
        default: 20,
        desc: 'Max balance changes to print'
      },
      'call-filter': {
        type: 'string',
        desc: 'Filter programmable calls by summary substring'
      },
      'call-detail-index': {
        type: 'number',
        desc: 'Print raw call detail for 1-based programmable call index'
      },
      'md-out': {
        type: 'string',
        desc: 'Write markdown trace report to file'
      },
      'html-out': {
        type: 'string',
        desc: 'Write HTML trace report to file'
      },
      'call-graph-out': {
        type: 'string',
        desc: 'Write Mermaid call graph (.mmd) for traced digests'
      },
      'call-graph-json-out': {
        type: 'string',
        desc: 'Write structured call graph JSON for traced digests'
      },
      'call-graph-title': {
        type: 'string',
        default: 'Dubhe Trace Call Graph',
        desc: 'Title/comment label for --call-graph-out output'
      },
      'replay-script-out': {
        type: 'string',
        desc: 'Write executable replay shell script for current trace options'
      },
      'consistency-out': {
        type: 'string',
        desc: 'Write replay consistency report JSON (chain execution vs dry-run)'
      },
      'consistency-gas-tolerance-pct': {
        type: 'number',
        default: 10,
        desc: 'Allowed charged-gas delta percentage in replay consistency check'
      },
      'consistency-max-rows': {
        type: 'number',
        default: 20,
        desc: 'Max mismatch rows printed in replay consistency summary'
      },
      'fail-on-consistency-mismatch': {
        type: 'boolean',
        default: false,
        desc: 'Exit non-zero when replay consistency mismatches are found'
      },
      'report-title': {
        type: 'string',
        default: 'Dubhe Trace Report',
        desc: 'Report title for --md-out/--html-out'
      }
    });
  },
  handler: async ({
    digest,
    'digest-file': digestFile,
    network,
    'rpc-url': rpcUrl,
    json,
    debug,
    replay,
    'replay-json': replayJson,
    'show-inputs': showInputs,
    'continue-on-error': continueOnError,
    'max-calls': maxCalls,
    'max-events': maxEvents,
    'max-object-changes': maxObjectChanges,
    'max-balance-changes': maxBalanceChanges,
    'call-filter': callFilter,
    'call-detail-index': callDetailIndex,
    'md-out': mdOut,
    'html-out': htmlOut,
    'call-graph-out': callGraphOut,
    'call-graph-json-out': callGraphJsonOut,
    'call-graph-title': callGraphTitle,
    'replay-script-out': replayScriptOut,
    'consistency-out': consistencyOut,
    'consistency-gas-tolerance-pct': consistencyGasTolerancePct,
    'consistency-max-rows': consistencyMaxRows,
    'fail-on-consistency-mismatch': failOnConsistencyMismatch,
    'report-title': reportTitle
  }) => {
    try {
      if (network == 'default') {
        network = await getDefaultNetwork();
        console.log(chalk.yellow(`Use default network: [${network}]`));
      }

      const url = rpcUrl || getFullnodeUrl(network);
      if (debug) {
        console.log(chalk.gray(`[debug] rpc=${url}`));
      }

      const digests: string[] = [];
      if (digest && digest.trim()) {
        digests.push(digest.trim());
      }
      if (digestFile) {
        const content = fs.readFileSync(digestFile, 'utf-8');
        const fromFile = content
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'));
        digests.push(...fromFile);
      }
      if (digests.length === 0) {
        throw new Error('Please provide --digest or --digest-file');
      }
      if ((consistencyOut || (failOnConsistencyMismatch ?? false)) && !replay) {
        throw new Error('Replay consistency check requires --replay (enable dry-run replay first)');
      }

      const client = new SuiClient({ url });
      const reportEntries: TraceReportEntry[] = [];
      for (let i = 0; i < digests.length; i++) {
        const currentDigest = digests[i];
        if (digests.length > 1) {
          console.log(chalk.blue(`\n[${i + 1}/${digests.length}] Trace digest: ${currentDigest}`));
        }
        try {
          const runResult = await traceOneDigest(client, currentDigest, network, {
            json,
            debug,
            replay,
            replayJson,
            showInputs,
            maxCalls,
            maxEvents,
            maxObjectChanges,
            maxBalanceChanges,
            callFilter,
            callDetailIndex
          });
          reportEntries.push({
            digest: currentDigest,
            trace: runResult.trace,
            dryRun: runResult.dryRun
          });
        } catch (error) {
          if (!(continueOnError ?? false)) throw error;
          logError(error);
        }
      }

      if (reportEntries.length > 0) {
        const title = reportTitle || 'Dubhe Trace Report';
        const graphTitle = callGraphTitle || 'Dubhe Trace Call Graph';
        if (mdOut) {
          fs.mkdirSync(path.dirname(mdOut), { recursive: true });
          fs.writeFileSync(mdOut, renderTraceMarkdown(reportEntries, title), 'utf-8');
          console.log(chalk.green(`Trace markdown report written: ${mdOut}`));
        }
        if (htmlOut) {
          fs.mkdirSync(path.dirname(htmlOut), { recursive: true });
          fs.writeFileSync(htmlOut, renderTraceHtml(reportEntries, title), 'utf-8');
          console.log(chalk.green(`Trace HTML report written: ${htmlOut}`));
        }
        if (callGraphOut) {
          fs.mkdirSync(path.dirname(callGraphOut), { recursive: true });
          fs.writeFileSync(
            callGraphOut,
            renderTraceCallGraphMermaid(reportEntries, graphTitle),
            'utf-8'
          );
          console.log(chalk.green(`Trace call graph written: ${callGraphOut}`));
        }
        if (callGraphJsonOut) {
          fs.mkdirSync(path.dirname(callGraphJsonOut), { recursive: true });
          fs.writeFileSync(
            callGraphJsonOut,
            renderTraceCallGraphJson(reportEntries, graphTitle),
            'utf-8'
          );
          console.log(chalk.green(`Trace call graph JSON written: ${callGraphJsonOut}`));
        }
      }

      if (replay && reportEntries.length > 0) {
        const gasTolerancePct = Number(consistencyGasTolerancePct ?? 10);
        const checks: ForkReplayReport['checks'] = [];
        for (const entry of reportEntries) {
          if (!entry.dryRun) {
            checks.push(
              buildForkReplayErrorCheck(
                entry.digest,
                new Error('dryRun response missing for replay consistency check')
              )
            );
            continue;
          }
          checks.push(compareForkReplay(entry.digest, entry.trace, entry.dryRun, gasTolerancePct));
        }
        const okCount = checks.filter((item) => item.ok).length;
        const consistencyReport: ForkReplayReport = {
          generatedAt: new Date().toISOString(),
          network,
          rpcUrl: url,
          gasTolerancePct,
          total: checks.length,
          ok: okCount,
          mismatch: checks.length - okCount,
          checks
        };
        process.stdout.write(
          `${summarizeForkReplayReport(
            consistencyReport,
            Math.max(1, Math.floor(consistencyMaxRows ?? 20))
          )}\n`
        );

        if (consistencyOut) {
          fs.mkdirSync(path.dirname(consistencyOut), { recursive: true });
          fs.writeFileSync(consistencyOut, JSON.stringify(consistencyReport, null, 2), 'utf-8');
          console.log(chalk.green(`Trace replay consistency report written: ${consistencyOut}`));
        }

        if ((failOnConsistencyMismatch ?? false) && hasForkReplayMismatch(consistencyReport)) {
          throw new Error('Trace replay consistency mismatch detected');
        }
      }

      if (replayScriptOut) {
        const replayScript = renderTraceReplayShellScript(digests, {
          network,
          rpcUrl,
          replay,
          replayJson,
          showInputs,
          json,
          continueOnError,
          maxCalls,
          maxEvents,
          maxObjectChanges,
          maxBalanceChanges,
          callFilter,
          callDetailIndex
        });
        fs.mkdirSync(path.dirname(replayScriptOut), { recursive: true });
        fs.writeFileSync(replayScriptOut, replayScript, 'utf-8');
        try {
          fs.chmodSync(replayScriptOut, 0o755);
        } catch {
          // Best effort on non-POSIX environments
        }
        console.log(chalk.green(`Trace replay script written: ${replayScriptOut}`));
      }
      handlerExit();
    } catch (error) {
      logError(error);
      handlerExit(1);
    }
  }
};

export default commandModule;
