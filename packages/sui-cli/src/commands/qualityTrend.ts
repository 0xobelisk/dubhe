import type { CommandModule } from 'yargs';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { handlerExit } from './shell';
import {
  QualitySnapshot,
  QualityThresholds,
  QualityTimeline,
  appendQualitySnapshot,
  evaluateQualitySnapshot,
  formatQualitySnapshotSummary,
  parseCoveragePct,
  parseFailureStatsFromReport,
  parseGasTotals
} from './qualityTrendUtils';

type Options = {
  'gas-profile'?: string;
  'coverage-summary'?: string;
  'fuzz-report'?: string;
  'invariant-report'?: string;
  timeline?: string;
  'snapshot-out'?: string;
  label?: string;
  append?: boolean;
  'max-history'?: number;
  'max-gas-regression-pct'?: number;
  'min-coverage-pct'?: number;
  'max-fuzz-failure-rate-pct'?: number;
  'max-invariant-failure-rate-pct'?: number;
  'fail-on-violation'?: boolean;
  json?: boolean;
  debug?: boolean;
};

function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function loadTimeline(timelinePath: string): QualityTimeline {
  if (!fs.existsSync(timelinePath)) {
    return { version: 1, snapshots: [] };
  }
  const raw = readJsonFile(timelinePath);
  if (typeof raw !== 'object' || raw == null) return { version: 1, snapshots: [] };
  const snapshots = Array.isArray((raw as any).snapshots) ? (raw as any).snapshots : [];
  return {
    version: 1,
    snapshots
  };
}

const commandModule: CommandModule<Options, Options> = {
  command: 'quality-trend',
  describe: 'Aggregate gas/coverage/fuzz metrics into a timeline and enforce trend thresholds',
  builder(yargs) {
    return yargs.options({
      'gas-profile': {
        type: 'string',
        desc: 'Gas profile JSON path (from dubhe test --profile-out or framework parser)'
      },
      'coverage-summary': {
        type: 'string',
        desc: 'Coverage summary text path (contains % Move Coverage)'
      },
      'fuzz-report': {
        type: 'string',
        desc: 'Fuzz report JSON path (from dubhe fuzz --report-out)'
      },
      'invariant-report': {
        type: 'string',
        desc: 'Invariant report JSON path (from dubhe invariant --report-out)'
      },
      timeline: {
        type: 'string',
        default: '.reports/move/quality-timeline.json',
        desc: 'Quality timeline JSON path'
      },
      'snapshot-out': {
        type: 'string',
        desc: 'Write current quality snapshot + evaluation JSON to file'
      },
      label: {
        type: 'string',
        desc: 'Optional label for this snapshot (e.g. ci-<run-id>)'
      },
      append: {
        type: 'boolean',
        default: true,
        desc: 'Append current snapshot into timeline file'
      },
      'max-history': {
        type: 'number',
        default: 200,
        desc: 'Maximum timeline entries to keep'
      },
      'max-gas-regression-pct': {
        type: 'number',
        desc: 'Fail if total gas regression exceeds this percentage vs previous snapshot'
      },
      'min-coverage-pct': {
        type: 'number',
        desc: 'Fail if current coverage is below this percentage'
      },
      'max-fuzz-failure-rate-pct': {
        type: 'number',
        desc: 'Fail if current fuzz failure rate exceeds this percentage'
      },
      'max-invariant-failure-rate-pct': {
        type: 'number',
        desc: 'Fail if current invariant failure rate exceeds this percentage'
      },
      'fail-on-violation': {
        type: 'boolean',
        default: true,
        desc: 'Exit non-zero when threshold violations are detected'
      },
      json: {
        type: 'boolean',
        default: false,
        desc: 'Print snapshot + evaluation as JSON'
      },
      debug: {
        type: 'boolean',
        default: false,
        desc: 'Print detailed metric loading logs'
      }
    });
  },
  handler: async ({
    'gas-profile': gasProfile,
    'coverage-summary': coverageSummary,
    'fuzz-report': fuzzReport,
    'invariant-report': invariantReport,
    timeline,
    'snapshot-out': snapshotOut,
    label,
    append,
    'max-history': maxHistory,
    'max-gas-regression-pct': maxGasRegressionPct,
    'min-coverage-pct': minCoveragePct,
    'max-fuzz-failure-rate-pct': maxFuzzFailureRatePct,
    'max-invariant-failure-rate-pct': maxInvariantFailureRatePct,
    'fail-on-violation': failOnViolation,
    json,
    debug
  }) => {
    try {
      if (!gasProfile && !coverageSummary && !fuzzReport && !invariantReport) {
        throw new Error(
          'Provide at least one input report (--gas-profile / --coverage-summary / --fuzz-report / --invariant-report)'
        );
      }

      const metrics: QualitySnapshot['metrics'] = {};
      if (gasProfile) {
        const gas = parseGasTotals(readJsonFile(gasProfile));
        if (!gas) throw new Error(`Unable to parse gas totals from: ${gasProfile}`);
        metrics.gasTotal = gas.totalGas;
        metrics.gasTests = gas.tests;
      }

      if (coverageSummary) {
        const coverage = parseCoveragePct(fs.readFileSync(coverageSummary, 'utf-8'));
        if (coverage == null) {
          throw new Error(`Unable to parse coverage percent from: ${coverageSummary}`);
        }
        metrics.coveragePct = coverage;
      }

      if (fuzzReport) {
        const fuzzStats = parseFailureStatsFromReport(readJsonFile(fuzzReport));
        if (!fuzzStats) throw new Error(`Unable to parse fuzz report: ${fuzzReport}`);
        metrics.fuzzTotal = fuzzStats.total;
        metrics.fuzzFailed = fuzzStats.failed;
        metrics.fuzzFailureRatePct = fuzzStats.failureRatePct;
      }

      if (invariantReport) {
        const invariantStats = parseFailureStatsFromReport(readJsonFile(invariantReport));
        if (!invariantStats)
          throw new Error(`Unable to parse invariant report: ${invariantReport}`);
        metrics.invariantTotal = invariantStats.total;
        metrics.invariantFailed = invariantStats.failed;
        metrics.invariantFailureRatePct = invariantStats.failureRatePct;
      }

      const snapshot: QualitySnapshot = {
        generatedAt: new Date().toISOString(),
        label,
        metrics,
        sources: {
          gasProfile,
          coverageSummary,
          fuzzReport,
          invariantReport
        }
      };

      const timelinePath = timeline || '.reports/move/quality-timeline.json';
      const loadedTimeline = loadTimeline(timelinePath);
      const previous = loadedTimeline.snapshots[loadedTimeline.snapshots.length - 1];
      const thresholds: QualityThresholds = {
        maxGasRegressionPct,
        minCoveragePct,
        maxFuzzFailureRatePct,
        maxInvariantFailureRatePct
      };
      const evaluation = evaluateQualitySnapshot(previous, snapshot, thresholds);
      const shouldAppend = append ?? true;
      const updatedTimeline = shouldAppend
        ? appendQualitySnapshot(
            loadedTimeline,
            snapshot,
            Math.max(1, Math.floor(maxHistory ?? 200))
          )
        : loadedTimeline;

      if (shouldAppend) {
        fs.mkdirSync(path.dirname(timelinePath), { recursive: true });
        fs.writeFileSync(timelinePath, JSON.stringify(updatedTimeline, null, 2), 'utf-8');
        console.log(chalk.green(`Quality timeline updated: ${timelinePath}`));
      }

      if (snapshotOut) {
        fs.mkdirSync(path.dirname(snapshotOut), { recursive: true });
        fs.writeFileSync(
          snapshotOut,
          JSON.stringify(
            {
              snapshot,
              previous,
              evaluation
            },
            null,
            2
          ),
          'utf-8'
        );
        console.log(chalk.green(`Quality snapshot written to: ${snapshotOut}`));
      }

      if (debug) {
        console.log(chalk.gray(`Loaded previous snapshot: ${previous ? 'yes' : 'no'}`));
        console.log(chalk.gray(`Violations: ${evaluation.violations.length}`));
      }

      if (json) {
        process.stdout.write(
          `${JSON.stringify(
            {
              snapshot,
              previous,
              evaluation
            },
            null,
            2
          )}\n`
        );
      } else {
        process.stdout.write(`${formatQualitySnapshotSummary(snapshot)}\n`);
        if (typeof evaluation.deltas.gasDeltaPct === 'number') {
          process.stdout.write(
            `Gas delta vs previous: ${evaluation.deltas.gasDeltaPct.toFixed(2)}%\n`
          );
        }
        if (typeof evaluation.deltas.coverageDeltaPct === 'number') {
          process.stdout.write(
            `Coverage delta vs previous: ${evaluation.deltas.coverageDeltaPct.toFixed(2)}%\n`
          );
        }
        if (typeof evaluation.deltas.fuzzFailureRateDeltaPct === 'number') {
          process.stdout.write(
            `Fuzz failure-rate delta vs previous: ${evaluation.deltas.fuzzFailureRateDeltaPct.toFixed(
              2
            )}%\n`
          );
        }
        if (typeof evaluation.deltas.invariantFailureRateDeltaPct === 'number') {
          process.stdout.write(
            `Invariant failure-rate delta vs previous: ${evaluation.deltas.invariantFailureRateDeltaPct.toFixed(
              2
            )}%\n`
          );
        }
      }

      if (evaluation.violations.length > 0) {
        console.error(chalk.red('\nQuality trend violations:'));
        for (const violation of evaluation.violations) {
          console.error(`  - ${violation}`);
        }
        if (failOnViolation ?? true) {
          handlerExit(1);
          return;
        }
      }

      handlerExit();
    } catch (error: any) {
      if (error.stdout) process.stdout.write(error.stdout);
      if (error.stderr) process.stderr.write(error.stderr);
      if (!error.stdout && !error.stderr && error.message) process.stderr.write(error.message);
      handlerExit(1);
    }
  }
};

export default commandModule;
