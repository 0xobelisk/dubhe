import { describe, expect, it } from 'vitest';
import type {
  DryRunTransactionBlockResponse,
  SuiTransactionBlockResponse
} from '@mysten/sui/client';
import {
  buildForkReplayErrorCheck,
  compareForkReplay,
  computeChargedGasFromEffects,
  hasForkReplayMismatch,
  summarizeForkReplayReport
} from '../src/commands/forkReplayUtils';

function buildTrace(status: 'success' | 'failure', gas: number): SuiTransactionBlockResponse {
  return {
    effects: {
      status: { status },
      gasUsed: {
        computationCost: `${gas}`,
        storageCost: '20',
        storageRebate: '5',
        nonRefundableStorageFee: '0'
      }
    },
    events: [{}, {}],
    objectChanges: [{}, {}]
  } as unknown as SuiTransactionBlockResponse;
}

function buildDryRun(status: 'success' | 'failure', gas: number): DryRunTransactionBlockResponse {
  return {
    effects: {
      status: { status },
      gasUsed: {
        computationCost: `${gas}`,
        storageCost: '20',
        storageRebate: '5',
        nonRefundableStorageFee: '0'
      }
    },
    events: [{}, {}],
    objectChanges: [{}, {}]
  } as unknown as DryRunTransactionBlockResponse;
}

describe('computeChargedGasFromEffects', () => {
  it('computes charged gas from cost and rebate', () => {
    const charged = computeChargedGasFromEffects({
      gasUsed: {
        computationCost: '100',
        storageCost: '10',
        storageRebate: '3'
      }
    });
    expect(charged).toBe(107);
  });
});

describe('compareForkReplay', () => {
  it('passes when status/event/object/gas all match', () => {
    const check = compareForkReplay(
      '0xaaa',
      buildTrace('success', 100),
      buildDryRun('success', 100),
      5
    );
    expect(check.ok).toBe(true);
    expect(check.statusMatch).toBe(true);
    expect(check.eventsMatch).toBe(true);
    expect(check.objectChangesMatch).toBe(true);
    expect(check.gasWithinTolerance).toBe(true);
  });

  it('detects mismatch when dry-run differs from on-chain', () => {
    const check = compareForkReplay(
      '0xbbb',
      buildTrace('success', 100),
      buildDryRun('failure', 160),
      5
    );
    expect(check.ok).toBe(false);
    expect(check.statusMatch).toBe(false);
    expect(check.gasWithinTolerance).toBe(false);
  });
});

describe('fork replay report summary', () => {
  it('summarizes mismatches and reports mismatch state', () => {
    const report = {
      generatedAt: '2026-03-28T00:00:00.000Z',
      network: 'testnet',
      rpcUrl: 'https://example.invalid',
      gasTolerancePct: 5,
      total: 2,
      ok: 1,
      mismatch: 1,
      checks: [
        compareForkReplay('0xok', buildTrace('success', 100), buildDryRun('success', 102), 5),
        buildForkReplayErrorCheck('0xerr', new Error('rpc timeout'))
      ]
    };
    const text = summarizeForkReplayReport(report);
    expect(text).toContain('Fork replay checks: total=2');
    expect(text).toContain('Mismatches:');
    expect(text).toContain('0xerr');
    expect(hasForkReplayMismatch(report)).toBe(true);
  });
});
