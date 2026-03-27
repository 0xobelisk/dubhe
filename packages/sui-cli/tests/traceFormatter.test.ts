import { describe, expect, it } from 'vitest';
import type { SuiTransactionBlockResponse } from '@mysten/sui/client';
import { formatTraceOutput } from '../src/commands/traceFormatter';

describe('formatTraceOutput', () => {
  it('renders a readable trace for programmable transactions', () => {
    const response = {
      digest: '4shY4NQxJz5LQ8cPPtJ25YJQ7gNBEaQ8v6r2e3j4r5t6',
      checkpoint: '123',
      timestampMs: '1710000000000',
      transaction: {
        data: {
          sender: '0x1111222233334444555566667777888899990000',
          gasData: {
            budget: '100000000',
            owner: '0x1111222233334444555566667777888899990000',
            payment: [],
            price: '750'
          },
          messageVersion: 'v1',
          transaction: {
            kind: 'ProgrammableTransaction',
            inputs: [],
            transactions: [
              {
                MoveCall: {
                  package: '0x2',
                  module: 'coin',
                  function: 'transfer',
                  arguments: [],
                  type_arguments: []
                }
              }
            ]
          }
        },
        txSignatures: []
      },
      effects: {
        executedEpoch: '100',
        gasObject: {
          owner: { AddressOwner: '0x1111222233334444555566667777888899990000' },
          reference: {
            objectId: '0xabc',
            version: '1',
            digest: '7vUuy8wS9KxQv9cGtx'
          }
        },
        gasUsed: {
          computationCost: '1200',
          storageCost: '300',
          storageRebate: '150',
          nonRefundableStorageFee: '3'
        },
        messageVersion: 'v1',
        status: {
          status: 'success'
        },
        transactionDigest: '4shY4NQxJz5LQ8cPPtJ25YJQ7gNBEaQ8v6r2e3j4r5t6'
      },
      events: [
        {
          id: {
            txDigest: '4shY4NQxJz5LQ8cPPtJ25YJQ7gNBEaQ8v6r2e3j4r5t6',
            eventSeq: '0'
          },
          packageId: '0x2',
          parsedJson: {},
          sender: '0x1111222233334444555566667777888899990000',
          timestampMs: '1710000000000',
          transactionModule: 'coin',
          type: '0x2::coin::TransferEvent',
          bcs: 'AA==',
          bcsEncoding: 'base64'
        }
      ],
      objectChanges: [
        {
          digest: '7vUuy8wS9KxQv9cGtx',
          objectId: '0xc0ffee',
          objectType: '0x2::coin::Coin<0x2::sui::SUI>',
          owner: { AddressOwner: '0x1111222233334444555566667777888899990000' },
          sender: '0x1111222233334444555566667777888899990000',
          type: 'mutated',
          version: '10',
          previousVersion: '9'
        }
      ],
      balanceChanges: [
        {
          amount: '-1350',
          coinType: '0x2::sui::SUI',
          owner: { AddressOwner: '0x1111222233334444555566667777888899990000' }
        }
      ]
    } as unknown as SuiTransactionBlockResponse;

    const output = formatTraceOutput(response);
    expect(output).toContain('Transaction Trace');
    expect(output).toContain('Status: SUCCESS');
    expect(output).toContain('Programmable Calls: 1');
    expect(output).toContain('MoveCall');
    expect(output).toContain('Object Changes: 1');
    expect(output).toContain('Balance Changes: 1');
  });

  it('renders failure reason when execution fails', () => {
    const response = {
      digest: 'digest',
      effects: {
        status: {
          status: 'failure',
          error: 'Move abort in 0x2::module::f with code 7'
        }
      }
    } as unknown as SuiTransactionBlockResponse;

    const output = formatTraceOutput(response);
    expect(output).toContain('Status: FAILURE');
    expect(output).toContain('Move abort');
  });
});
