import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GrpcTypes } from '@mysten/sui-v2/grpc';
import { createSuiRpcClient, loadMetadata } from '../dist/index.mjs';

const mainnetUrl = 'https://fullnode.mainnet.sui.io';
const address = (suffix) => `0x${suffix.padStart(64, '0')}`;
const emptyPage = { hasNextPage: false, endCursor: null };
const digest = '11111111111111111111111111111111';

function grpcResponse(type, data) {
  const payload = type.toBinary(type.create(data));
  function frame(flag, bytes) {
    const header = Buffer.alloc(5, flag);
    header.writeUInt32BE(bytes.length, 1);
    return Buffer.concat([header, bytes]);
  }
  return new Response(
    Buffer.concat([frame(0, payload), frame(128, Buffer.from('grpc-status:0\r\n'))]),
    { headers: { 'content-type': 'application/grpc-web+proto' } }
  );
}

test('loads the Move ABI and bytecode details for the same published package', async (t) => {
  const pkg = address('a1');
  const originalId = address('a0');
  const {
    OpenSignatureBody_Type: type,
    OpenSignature_Reference: ref,
    FunctionDescriptor_Visibility: visibility
  } = GrpcTypes;
  const calls = t.mock.method(globalThis, 'fetch', async (input, init) => {
    const url = new URL(input);
    if (url.pathname.endsWith('/GetPackage')) {
      return grpcResponse(GrpcTypes.GetPackageResponse, {
        package: {
          storageId: pkg,
          originalId,
          version: 2n,
          modules: [
            {
              name: 'sample',
              functions: [
                {
                  name: 'update',
                  visibility: visibility.PUBLIC,
                  isEntry: true,
                  parameters: [
                    {
                      reference: ref.MUTABLE,
                      body: { type: type.DATATYPE, typeName: `${originalId}::sample::State` }
                    },
                    { body: { type: type.TYPE_PARAMETER, typeParameter: 0 } }
                  ]
                },
                { name: 'helper', visibility: visibility.PRIVATE }
              ]
            }
          ]
        }
      });
    }
    assert.equal(url.hostname, 'graphql.mainnet.sui.io');
    const request = JSON.parse(init.body);
    assert.deepEqual(request.variables, { id: pkg, version: 2, after: null });
    return Response.json({
      data: {
        package: {
          address: pkg,
          modules: {
            nodes: [
              {
                name: 'sample',
                fileFormatVersion: 7,
                friends: {
                  nodes: [{ fullyQualifiedName: `${originalId}::other` }],
                  pageInfo: emptyPage
                }
              }
            ],
            pageInfo: emptyPage
          }
        }
      }
    });
  });
  const result = await loadMetadata('mainnet', pkg);
  assert.equal(result.sample.address, '0xa0');
  assert.equal(result.sample.fileFormatVersion, 7);
  assert.deepEqual(result.sample.friends, [{ address: '0xa0', name: 'other' }]);
  assert.deepEqual(Object.keys(result.sample.exposedFunctions), ['update']);
  assert.deepEqual(result.sample.exposedFunctions.update.parameters, [
    {
      MutableReference: {
        Struct: { address: '0xa0', module: 'sample', name: 'State', typeArguments: [] }
      }
    },
    { TypeParameter: 0 }
  ]);
  assert.equal(calls.mock.callCount(), 2);
});

test('preserves object references and distinguishes a missing object in a batch', async (t) => {
  const clock = address('6');
  const missing = address('dead');
  t.mock.method(globalThis, 'fetch', async (input) => {
    assert.equal(new URL(input).pathname, '/sui.rpc.v2.LedgerService/BatchGetObjects');
    return grpcResponse(GrpcTypes.BatchGetObjectsResponse, {
      objects: [
        {
          result: {
            oneofKind: 'object',
            object: GrpcTypes.Object.fromJson({
              objectId: clock,
              digest,
              version: '9',
              objectType: `${address('2')}::clock::Clock`,
              hasPublicTransfer: false,
              owner: { kind: 'SHARED', version: '1' },
              contents: { value: 'AA==' },
              json: { id: clock, timestamp_ms: '4294967296' }
            })
          }
        },
        { result: { oneofKind: 'error', error: { code: 5, message: 'Object not found' } } }
      ]
    });
  });
  const client = createSuiRpcClient('https://fullnode.testnet.sui.io:443');
  const [found, absent] = await client.multiGetObjects({
    ids: [clock, missing],
    options: { showOwner: true, showBcs: true, showContent: true, showType: true }
  });
  assert.equal(found.data.type, '0x2::clock::Clock');
  assert.deepEqual(found.data.owner, { Shared: { initial_shared_version: '1' } });
  assert.deepEqual(found.data.content.fields, { id: { id: clock }, timestamp_ms: '4294967296' });
  assert.equal(found.data.bcs.bcsBytes, 'AA==');
  assert.deepEqual(absent, { error: { code: 'notExists', object_id: missing } });
});

test('waits for checkpoint inclusion and preserves the address balance gas sentinel', async (t) => {
  let reads = 0;
  t.mock.method(globalThis, 'fetch', async (input) => {
    assert.equal(new URL(input).pathname, '/sui.rpc.v2.LedgerService/GetTransaction');
    reads++;
    return grpcResponse(GrpcTypes.GetTransactionResponse, {
      transaction: {
        digest,
        checkpoint: reads === 2 ? 123n : undefined,
        effects: { epoch: 7n, status: { success: true }, gasUsed: { computationCost: 42n } }
      }
    });
  });
  const result = await createSuiRpcClient(mainnetUrl).waitForTransaction({
    digest,
    pollInterval: 1,
    timeout: 2000,
    options: { showEffects: true }
  });
  assert.equal(reads, 2);
  assert.equal(result.checkpoint, '123');
  assert.equal(result.effects.status.status, 'success');
  assert.equal(result.effects.gasUsed.computationCost, '42');
  assert.deepEqual(result.effects.gasObject.reference, {
    objectId: address('0'),
    digest,
    version: '0'
  });
});
