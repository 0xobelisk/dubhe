import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { createSuiRpcClient, Dubhe } from '@0xobelisk/sui-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { switchEnv } from '../src/utils/utils';

vi.mock('child_process', async () => ({
  ...(await vi.importActual<typeof import('child_process')>('child_process')),
  spawn: vi.fn()
}));

const genesisDigest = '4btiuiMPvEENsttpZC7CZ53DruC3MAgfznDbASZ7DR6S';
const serviceInfoPath = '/sui.rpc.v2.LedgerService/GetServiceInfo';

function grpcResponse(message: Buffer): Response {
  function frame(flag: number, body: Buffer): Buffer {
    const header = Buffer.alloc(5, flag);
    header.writeUInt32BE(body.length, 1);
    return Buffer.concat([header, body]);
  }

  return new Response(
    Buffer.concat([frame(0, message), frame(128, Buffer.from('grpc-status:0\r\n'))]),
    {
      headers: { 'content-type': 'application/grpc-web+proto' }
    }
  );
}

function serviceInfo(checkpoint: number): Response {
  // Protobuf field 1 is the genesis digest. Field 4 is the checkpoint height.
  return grpcResponse(
    Buffer.concat([
      Buffer.from([0x0a, genesisDigest.length]),
      Buffer.from(genesisDigest),
      Buffer.from([0x20, checkpoint])
    ])
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe('Sui RPC compatibility', () => {
  it('reads chain identity and checkpoint from gRPC through the default Dubhe client', async () => {
    const fetchRpc = vi.fn(async (url: string) => {
      expect(new URL(url).pathname).toBe(serviceInfoPath);
      return serviceInfo(0);
    });
    vi.stubGlobal('fetch', fetchRpc);
    const client = new Dubhe({ networkType: 'mainnet' }).client();

    await expect(client.getLatestCheckpointSequenceNumber()).resolves.toBe('0');
    await expect(client.getChainIdentifier()).resolves.toBe('35834a8a');
    expect(fetchRpc).toHaveBeenCalledTimes(2);
  });

  it('reads reference gas price as a bigint through the mainnet epoch service', async () => {
    const fetchRpc = vi.fn(async (url: string) => {
      expect(new URL(url).pathname).toBe('/sui.rpc.v2.LedgerService/GetEpoch');
      // GetEpochResponse.epoch contains field 8 (reference_gas_price), set to 1000.
      return grpcResponse(Buffer.from([0x0a, 3, 0x40, 0xe8, 0x07]));
    });
    vi.stubGlobal('fetch', fetchRpc);
    const client = createSuiRpcClient('https://fullnode.mainnet.sui.io/');

    await expect(client.getReferenceGasPrice()).resolves.toBe(1000n);
    expect(fetchRpc).toHaveBeenCalledTimes(1);
  });

  it('retries a failed gRPC probe before switching the Sui CLI environment', async () => {
    const fetchRpc = vi
      .fn(async (url: string) => {
        expect(new URL(url).pathname).toBe(serviceInfoPath);
        return serviceInfo(42);
      })
      .mockRejectedValueOnce(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchRpc);
    vi.mocked(spawn).mockImplementation(() => {
      const process = Object.assign(new EventEmitter(), {
        stdout: new EventEmitter(),
        stderr: new EventEmitter()
      });
      queueMicrotask(() => process.emit('exit', 0, null));
      return process as unknown as ChildProcess;
    });

    await switchEnv('mainnet');

    expect(fetchRpc).toHaveBeenCalledTimes(2);
    expect(spawn).toHaveBeenNthCalledWith(
      1,
      'sui',
      ['client', 'new-env', '--alias', 'mainnet', '--rpc', 'https://fullnode.mainnet.sui.io:443'],
      expect.any(Object)
    );
    expect(spawn).toHaveBeenNthCalledWith(
      2,
      'sui',
      ['client', 'switch', '--env', 'mainnet'],
      expect.any(Object)
    );
  });

  it('uses JSON-RPC at a user-provided endpoint', async () => {
    const endpoint = 'https://fullnode.mainnet.sui.io:443/custom';
    const fetchRpc = vi.fn(async (_url: string, _init: RequestInit) =>
      Response.json({ jsonrpc: '2.0', id: 1, result: '123' })
    );
    vi.stubGlobal('fetch', fetchRpc);

    await expect(createSuiRpcClient(endpoint).getLatestCheckpointSequenceNumber()).resolves.toBe(
      '123'
    );
    expect(fetchRpc).toHaveBeenCalledTimes(1);
    expect(fetchRpc.mock.calls[0][0]).toBe(endpoint);
    expect(JSON.parse(String(fetchRpc.mock.calls[0][1].body))).toMatchObject({
      method: 'sui_getLatestCheckpointSequenceNumber'
    });
  });

  it('does not switch environments when an RPC response has no checkpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => grpcResponse(Buffer.alloc(0)))
    );

    await expect(switchEnv('mainnet')).rejects.toThrow('RPC endpoint');
    expect(spawn).not.toHaveBeenCalled();
  });
});
