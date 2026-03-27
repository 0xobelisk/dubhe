import { describe, expect, it } from 'vitest';
import type { SuiTransactionBlockResponse } from '@mysten/sui/client';
import {
  renderTraceCallGraphMermaid,
  renderTraceHtml,
  renderTraceMarkdown
} from '../src/commands/traceReport';

function buildTrace(digest: string, status: 'success' | 'failure'): SuiTransactionBlockResponse {
  return {
    digest,
    effects: {
      status: { status },
      gasUsed: {
        computationCost: '100',
        storageCost: '20',
        storageRebate: '5',
        nonRefundableStorageFee: '0'
      }
    },
    events: [{}, {}],
    objectChanges: [{ type: 'created' }],
    balanceChanges: [{ amount: '-1' }, { amount: '+1' }],
    transaction: {
      data: {
        transaction: {
          kind: 'ProgrammableTransaction',
          inputs: [],
          transactions: [{ MoveCall: { package: '0x2', module: 'm', function: 'f' } }]
        }
      }
    }
  } as unknown as SuiTransactionBlockResponse;
}

describe('trace report rendering', () => {
  it('renders markdown summary and detail sections', () => {
    const markdown = renderTraceMarkdown(
      [
        {
          digest: '0xaaa',
          trace: buildTrace('0xaaa', 'success')
        }
      ],
      'Trace Title'
    );
    expect(markdown).toContain('# Trace Title');
    expect(markdown).toContain('| Digest | Status |');
    expect(markdown).toContain('### 0xaaa');
  });

  it('renders html table and detail cards', () => {
    const html = renderTraceHtml(
      [
        {
          digest: '0xbbb',
          trace: buildTrace('0xbbb', 'failure')
        }
      ],
      'Trace HTML'
    );
    expect(html).toContain('<table>');
    expect(html).toContain('Trace HTML');
    expect(html).toContain('0xbbb');
  });

  it('renders mermaid call graph for programmable calls', () => {
    const graph = renderTraceCallGraphMermaid(
      [
        {
          digest: '0xccc',
          trace: buildTrace('0xccc', 'success')
        }
      ],
      'Trace Graph'
    );

    expect(graph).toContain('flowchart TD');
    expect(graph).toContain('subgraph tx1');
    expect(graph).toContain('1. m::f');
  });
});
