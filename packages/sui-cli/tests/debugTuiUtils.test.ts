import { describe, expect, it } from 'vitest';
import {
  buildPseudoCallStack,
  clampIndex,
  extractDigestFromEvent,
  filterWorkbenchEvents,
  findContinueIndex
} from '../src/commands/debugTuiUtils';
import type { WorkbenchEvent } from '../src/commands/workbenchUtils';

const events: WorkbenchEvent[] = [
  {
    id: 'e1',
    category: 'trace',
    severity: 'info',
    title: 'Trace tx: 0xaaaa1111',
    detail: 'transaction trace',
    tags: ['trace', 'tx']
  },
  {
    id: 'e2',
    category: 'debug',
    severity: 'warn',
    title: 'Abort hint',
    detail: 'Move abort in 0xaaaa1111',
    tags: ['debug', 'hint']
  },
  {
    id: 'e3',
    category: 'gas',
    severity: 'error',
    title: 'Gas regression',
    detail: 'deltaPct=20',
    tags: ['gas', 'regression']
  }
];

describe('filterWorkbenchEvents', () => {
  it('filters by category, severity and search query', () => {
    const all = filterWorkbenchEvents(events, { category: 'all', severity: 'all', search: '' });
    expect(all).toHaveLength(3);

    const gasOnly = filterWorkbenchEvents(events, {
      category: 'gas',
      severity: 'all',
      search: ''
    });
    expect(gasOnly).toHaveLength(1);
    expect(gasOnly[0].id).toBe('e3');

    const warnSearch = filterWorkbenchEvents(events, {
      category: 'all',
      severity: 'warn',
      search: 'abort'
    });
    expect(warnSearch).toHaveLength(1);
    expect(warnSearch[0].id).toBe('e2');
  });
});

describe('extractDigestFromEvent', () => {
  it('extracts digest-like token from event fields', () => {
    expect(extractDigestFromEvent(events[0])).toBe('0xaaaa1111');
    expect(extractDigestFromEvent(events[2])).toBeUndefined();
  });
});

describe('buildPseudoCallStack', () => {
  it('builds ordered call stack labels for digest', () => {
    const graph = {
      nodes: [
        { id: 'tx1_root', digest: '0xaaaa1111', label: 'root', kind: 'tx' },
        { id: 'tx1_kind', digest: '0xaaaa1111', label: 'programmable', kind: 'kind' },
        { id: 'tx1_c1', digest: '0xaaaa1111', label: '1. move::f', kind: 'call', callIndex: 1 },
        { id: 'tx2_root', digest: '0xbbbb2222', label: 'other', kind: 'tx' }
      ]
    };
    const stack = buildPseudoCallStack(graph, '0xaaaa1111');
    expect(stack).toEqual(['root', 'programmable', '1. move::f']);
  });
});

describe('findContinueIndex', () => {
  it('jumps to next breakpoint or non-info event', () => {
    expect(findContinueIndex(events, 0, new Set<string>())).toBe(1);
    expect(findContinueIndex(events, 1, new Set<string>(['e3']))).toBe(2);
    expect(findContinueIndex(events, 2, new Set<string>())).toBeUndefined();
  });
});

describe('clampIndex', () => {
  it('clamps index to event list bounds', () => {
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(2, 3)).toBe(2);
    expect(clampIndex(30, 3)).toBe(2);
    expect(clampIndex(1, 0)).toBe(0);
  });
});
