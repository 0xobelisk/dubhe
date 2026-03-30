import type {
  DryRunTransactionBlockResponse,
  SuiTransactionBlockResponse
} from '@mysten/sui/client';

export type ForkReplayCheck = {
  digest: string;
  statusOnChain: string;
  statusDryRun: string;
  statusMatch: boolean;
  chargedGasOnChain?: number;
  chargedGasDryRun?: number;
  gasDeltaAbs?: number;
  gasDeltaPct?: number;
  gasWithinTolerance: boolean;
  gasTolerancePct: number;
  eventsOnChain: number;
  eventsDryRun: number;
  eventsMatch: boolean;
  objectChangesOnChain: number;
  objectChangesDryRun: number;
  objectChangesMatch: boolean;
  ok: boolean;
  error?: string;
};

export type ForkReplayReport = {
  generatedAt: string;
  network: string;
  rpcUrl: string;
  gasTolerancePct: number;
  total: number;
  ok: number;
  mismatch: number;
  checks: ForkReplayCheck[];
};

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function computeChargedGasFromEffects(effects: any): number | undefined {
  if (!effects || typeof effects !== 'object') return undefined;
  const gasUsed = (effects as any).gasUsed;
  if (!gasUsed || typeof gasUsed !== 'object') return undefined;
  const computation = toNumber(gasUsed.computationCost);
  const storage = toNumber(gasUsed.storageCost);
  const rebate = toNumber(gasUsed.storageRebate);
  if (
    typeof computation !== 'number' ||
    typeof storage !== 'number' ||
    typeof rebate !== 'number'
  ) {
    return undefined;
  }
  return computation + storage - rebate;
}

export function compareForkReplay(
  digest: string,
  trace: SuiTransactionBlockResponse,
  dryRun: DryRunTransactionBlockResponse,
  gasTolerancePct: number
): ForkReplayCheck {
  const statusOnChain = trace.effects?.status?.status ?? 'unknown';
  const statusDryRun = dryRun.effects?.status?.status ?? 'unknown';
  const statusMatch = statusOnChain === statusDryRun;

  const chargedGasOnChain = computeChargedGasFromEffects(trace.effects);
  const chargedGasDryRun = computeChargedGasFromEffects(dryRun.effects);

  const eventsOnChain = trace.events?.length ?? 0;
  const eventsDryRun = dryRun.events?.length ?? 0;
  const eventsMatch = eventsOnChain === eventsDryRun;

  const objectChangesOnChain = trace.objectChanges?.length ?? 0;
  const objectChangesDryRun = dryRun.objectChanges?.length ?? 0;
  const objectChangesMatch = objectChangesOnChain === objectChangesDryRun;

  let gasDeltaAbs: number | undefined;
  let gasDeltaPct: number | undefined;
  let gasWithinTolerance = true;
  if (typeof chargedGasOnChain === 'number' && typeof chargedGasDryRun === 'number') {
    gasDeltaAbs = Math.abs(chargedGasDryRun - chargedGasOnChain);
    if (chargedGasOnChain === 0) {
      gasDeltaPct = gasDeltaAbs === 0 ? 0 : 100;
    } else {
      gasDeltaPct = (gasDeltaAbs / chargedGasOnChain) * 100;
    }
    gasWithinTolerance = gasDeltaPct <= gasTolerancePct;
  }

  const ok = statusMatch && eventsMatch && objectChangesMatch && gasWithinTolerance;

  return {
    digest,
    statusOnChain,
    statusDryRun,
    statusMatch,
    chargedGasOnChain,
    chargedGasDryRun,
    gasDeltaAbs,
    gasDeltaPct,
    gasWithinTolerance,
    gasTolerancePct,
    eventsOnChain,
    eventsDryRun,
    eventsMatch,
    objectChangesOnChain,
    objectChangesDryRun,
    objectChangesMatch,
    ok
  };
}

export function buildForkReplayErrorCheck(digest: string, error: unknown): ForkReplayCheck {
  const message = error instanceof Error ? error.message : String(error);
  return {
    digest,
    statusOnChain: 'error',
    statusDryRun: 'error',
    statusMatch: false,
    gasWithinTolerance: false,
    gasTolerancePct: 0,
    eventsOnChain: 0,
    eventsDryRun: 0,
    eventsMatch: false,
    objectChangesOnChain: 0,
    objectChangesDryRun: 0,
    objectChangesMatch: false,
    ok: false,
    error: message
  };
}

export function summarizeForkReplayReport(report: ForkReplayReport, maxRows: number = 20): string {
  const lines: string[] = [];
  lines.push(
    `Fork replay checks: total=${report.total}, ok=${report.ok}, mismatch=${report.mismatch}, gasTolerancePct=${report.gasTolerancePct}%`
  );

  const mismatches = report.checks.filter((item) => !item.ok);
  if (mismatches.length === 0) {
    lines.push('All replay checks matched on-chain execution within tolerance.');
    return lines.join('\n');
  }

  lines.push('Mismatches:');
  const cap = Math.max(1, Math.floor(maxRows));
  for (const item of mismatches.slice(0, cap)) {
    if (item.error) {
      lines.push(`  - ${item.digest}: error=${item.error}`);
      continue;
    }
    lines.push(
      `  - ${item.digest}: status=${item.statusOnChain}/${item.statusDryRun}, events=${
        item.eventsOnChain
      }/${item.eventsDryRun}, objectChanges=${item.objectChangesOnChain}/${
        item.objectChangesDryRun
      }, gasDeltaPct=${typeof item.gasDeltaPct === 'number' ? item.gasDeltaPct.toFixed(2) : 'n/a'}`
    );
  }
  if (mismatches.length > cap) {
    lines.push(`  ... ${mismatches.length - cap} more mismatches`);
  }
  return lines.join('\n');
}

export function hasForkReplayMismatch(report: ForkReplayReport): boolean {
  return report.mismatch > 0;
}
