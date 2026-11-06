import type {
  DevInspectResults,
  OwnedObjectRef,
  SuiArgument,
  SuiEvent,
  SuiObjectChange,
  SuiObjectRef,
  SuiTransactionBlockResponse,
  SuiTransactionBlockResponseOptions,
  TransactionEffects
} from '@mysten/sui/client';
import { normalizeSuiAddress, toBase58, toBase64 } from '@mysten/sui/utils';
import type { GrpcTypes } from '@mysten/sui-v2/grpc';
import { legacyObjectType, normalizeOwner, objectJson } from './grpcObjects';

type Proto = typeof GrpcTypes;
const zeroAddress = normalizeSuiAddress('0x0');
const zeroDigest = toBase58(new Uint8Array(32));
// Sui's legacy effects use these digest markers for wrapped and deleted objects.
const wrappedDigest = toBase58(new Uint8Array(32).fill(88));
const deletedDigest = toBase58(new Uint8Array(32).fill(99));

export function transactionFields(options: SuiTransactionBlockResponseOptions = {}): string[] {
  if (options.showInput || options.showRawInput) {
    throw new Error(
      'Legacy transaction input encoding is not available on the public gRPC transport'
    );
  }
  const paths = ['digest', 'checkpoint', 'timestamp'];
  if (options.showEffects) paths.push('effects');
  else if (options.showRawEffects) paths.push('effects.bcs');
  if (options.showEvents) paths.push('events');
  if (options.showBalanceChanges) paths.push('balance_changes');
  if (options.showObjectChanges) {
    if (!options.showEffects) paths.push('effects.changed_objects', 'effects.lamport_version');
    paths.push(
      'transaction.sender',
      'objects.objects.object_id',
      'objects.objects.package.modules.name'
    );
  }
  return paths;
}

function outputRef(change: GrpcTypes.ChangedObject): SuiObjectRef {
  const { objectId, outputDigest, outputVersion } = change;
  if (!objectId || !outputDigest || outputVersion === undefined) {
    throw new Error('Sui gRPC returned an incomplete transaction output reference');
  }
  return { objectId, digest: outputDigest, version: outputVersion.toString() };
}

function ownedOutput(change: GrpcTypes.ChangedObject, proto: Proto): OwnedObjectRef {
  const owner =
    change.outputState === proto.ChangedObject_OutputObjectState.PACKAGE_WRITE
      ? 'Immutable'
      : change.outputOwner && normalizeOwner(change.outputOwner, proto);
  if (!owner) throw new Error('Sui gRPC is missing the transaction output owner');
  return { owner, reference: outputRef(change) };
}

function effects(
  effect: GrpcTypes.TransactionEffects,
  digest: string,
  proto: Proto
): TransactionEffects {
  const { gasUsed, status, epoch, lamportVersion } = effect;
  if (!gasUsed || status?.success === undefined || epoch === undefined) {
    throw new Error(`Sui gRPC returned incomplete effects for transaction ${digest}`);
  }
  const result: TransactionEffects = {
    messageVersion: 'v1',
    transactionDigest: digest,
    status: status.success
      ? { status: 'success' }
      : { status: 'failure', error: status.error?.description ?? 'Transaction execution failed' },
    executedEpoch: epoch.toString(),
    gasUsed: {
      computationCost: (gasUsed.computationCost ?? 0n).toString(),
      storageCost: (gasUsed.storageCost ?? 0n).toString(),
      storageRebate: (gasUsed.storageRebate ?? 0n).toString(),
      nonRefundableStorageFee: (gasUsed.nonRefundableStorageFee ?? 0n).toString()
    },
    gasObject: effect.gasObject
      ? ownedOutput(effect.gasObject, proto)
      : {
          // Match Sui's legacy sentinel when gas comes from an address balance.
          owner: { AddressOwner: zeroAddress },
          reference: { objectId: zeroAddress, version: '0', digest: zeroDigest }
        },
    dependencies: effect.dependencies,
    eventsDigest: effect.eventsDigest
  };
  const outputState = proto.ChangedObject_OutputObjectState;
  const idOperation = proto.ChangedObject_IdOperation;
  const shared = proto.Owner_OwnerKind;
  for (const change of effect.changedObjects) {
    const { objectId, inputVersion, inputDigest, inputOwner } = change;
    const existed = change.inputState === proto.ChangedObject_InputObjectState.EXISTS;
    if (change.outputState === outputState.ACCUMULATOR_WRITE) continue;
    if (existed && objectId && inputVersion !== undefined) {
      (result.modifiedAtVersions ??= []).push({
        objectId,
        sequenceNumber: inputVersion.toString()
      });
      if (
        inputDigest &&
        (inputOwner?.kind === shared.SHARED || inputOwner?.kind === shared.CONSENSUS_ADDRESS)
      ) {
        (result.sharedObjects ??= []).push({
          objectId,
          version: inputVersion.toString(),
          digest: inputDigest
        });
      }
    }
    if (
      change.outputState === outputState.OBJECT_WRITE ||
      change.outputState === outputState.PACKAGE_WRITE
    ) {
      const output = ownedOutput(change, proto);
      if (change.idOperation === idOperation.CREATED) (result.created ??= []).push(output);
      else if (existed) (result.mutated ??= []).push(output);
      else (result.unwrapped ??= []).push(output);
    } else if (
      change.outputState === outputState.DOES_NOT_EXIST &&
      objectId &&
      lamportVersion !== undefined
    ) {
      const deleted = change.idOperation === idOperation.DELETED;
      const reference = {
        objectId,
        version: lamportVersion.toString(),
        digest: deleted ? deletedDigest : wrappedDigest
      };
      if (deleted && existed) (result.deleted ??= []).push(reference);
      else if (deleted) (result.unwrappedThenDeleted ??= []).push(reference);
      else if (existed) (result.wrapped ??= []).push(reference);
    }
  }
  for (const { objectId, version, digest } of effect.unchangedConsensusObjects) {
    if (objectId && version !== undefined && digest) {
      (result.sharedObjects ??= []).push({ objectId, version: version.toString(), digest });
    }
  }
  return result;
}

function events(raw: GrpcTypes.ExecutedTransaction, digest: string, proto: Proto): SuiEvent[] {
  return (raw.events?.events ?? []).map((event, index) => {
    const { packageId, module, sender, eventType, contents } = event;
    if (!packageId || !module || !sender || !eventType || !contents?.value) {
      throw new Error(`Sui gRPC returned an incomplete event for transaction ${digest}`);
    }
    return {
      id: { txDigest: digest, eventSeq: (event.eventIndex ?? index).toString() },
      packageId,
      transactionModule: module,
      sender,
      type: legacyObjectType(eventType),
      parsedJson: objectJson(event.json, proto),
      bcs: toBase64(contents.value),
      bcsEncoding: 'base64'
    };
  });
}

function objectChanges(raw: GrpcTypes.ExecutedTransaction, proto: Proto): SuiObjectChange[] {
  const changes: SuiObjectChange[] = [];
  const state = proto.ChangedObject_OutputObjectState;
  const operation = proto.ChangedObject_IdOperation;
  const sender = raw.transaction?.sender;
  for (const change of raw.effects?.changedObjects ?? []) {
    const { objectId, objectType, inputOwner, inputVersion } = change;
    if (change.outputState === state.PACKAGE_WRITE) {
      const ref = outputRef(change);
      const pkg = raw.objects?.objects.find((object) => object.objectId === ref.objectId)?.package;
      changes.push({
        type: 'published',
        packageId: ref.objectId,
        digest: ref.digest,
        version: ref.version,
        modules: pkg?.modules.flatMap(({ name }) => (name ? [name] : [])) ?? []
      });
    } else if (change.outputState === state.OBJECT_WRITE && objectType && sender) {
      const { owner, reference } = ownedOutput(change, proto);
      const output = { ...reference, objectType: legacyObjectType(objectType), sender };
      if (change.idOperation === operation.CREATED)
        changes.push({ ...output, type: 'created', owner });
      else if (inputVersion !== undefined) {
        if (
          inputOwner &&
          JSON.stringify(normalizeOwner(inputOwner, proto)) !== JSON.stringify(owner)
        ) {
          changes.push({ ...output, type: 'transferred', recipient: owner });
        } else {
          changes.push({
            ...output,
            type: 'mutated',
            owner,
            previousVersion: inputVersion.toString()
          });
        }
      }
    } else if (change.outputState === state.DOES_NOT_EXIST && objectId && objectType && sender) {
      const version = raw.effects?.lamportVersion;
      if (version !== undefined) {
        changes.push({
          objectId,
          objectType: legacyObjectType(objectType),
          sender,
          version: version.toString(),
          type: change.idOperation === operation.DELETED ? 'deleted' : 'wrapped'
        });
      }
    }
  }
  return changes;
}

export function transactionResult(
  raw: GrpcTypes.ExecutedTransaction | undefined,
  proto: Proto,
  options: SuiTransactionBlockResponseOptions = {}
): SuiTransactionBlockResponse {
  if (!raw?.digest) throw new Error('Sui gRPC returned no transaction digest');
  const result: SuiTransactionBlockResponse = { digest: raw.digest };
  if (raw.checkpoint !== undefined) result.checkpoint = raw.checkpoint.toString();
  if (raw.timestamp) {
    result.timestampMs = (
      raw.timestamp.seconds * 1000n +
      BigInt(Math.floor(raw.timestamp.nanos / 1e6))
    ).toString();
  }
  if (options.showEffects && raw.effects) result.effects = effects(raw.effects, raw.digest, proto);
  if (options.showRawEffects && raw.effects?.bcs?.value)
    result.rawEffects = Array.from(raw.effects.bcs.value);
  if (options.showEvents) result.events = events(raw, raw.digest, proto);
  if (options.showObjectChanges) result.objectChanges = objectChanges(raw, proto);
  if (options.showBalanceChanges) {
    result.balanceChanges = raw.balanceChanges.map(({ address, amount, coinType }) => {
      if (!address || amount === undefined || !coinType) {
        throw new Error(
          `Sui gRPC returned an incomplete balance change for transaction ${raw.digest}`
        );
      }
      return { owner: { AddressOwner: address }, amount, coinType: legacyObjectType(coinType) };
    });
  }
  return result;
}

function argument(input: GrpcTypes.Argument | undefined, proto: Proto): SuiArgument {
  const kind = proto.Argument_ArgumentKind;
  if (input?.kind === kind.GAS) return 'GasCoin';
  if (input?.kind === kind.INPUT && input.input !== undefined) return { Input: input.input };
  if (input?.kind === kind.RESULT && input.result !== undefined) {
    return input.subresult === undefined
      ? { Result: input.result }
      : { NestedResult: [input.result, input.subresult] };
  }
  throw new Error('Sui gRPC returned an invalid mutable reference argument');
}

export function inspectResult(
  raw: GrpcTypes.SimulateTransactionResponse,
  proto: Proto
): DevInspectResults {
  const tx = raw.transaction;
  if (!tx?.effects) throw new Error('Sui gRPC returned no simulated transaction effects');
  const digest = tx.digest ?? tx.effects.transactionDigest ?? zeroDigest;
  const txEffects = effects(tx.effects, digest, proto);
  const value = (output: GrpcTypes.CommandOutput): [number[], string] => {
    const { name, value } = output.value ?? {};
    if (!name || !value) throw new Error('Sui gRPC returned an incomplete simulation output');
    return [Array.from(value), name];
  };
  return {
    effects: txEffects,
    events: events(tx, digest, proto),
    error: txEffects.status.error,
    results: raw.commandOutputs.map(({ returnValues, mutatedByRef }) => ({
      returnValues: returnValues.map(value),
      mutableReferenceOutputs: mutatedByRef.map((output) => [
        argument(output.argument, proto),
        ...value(output)
      ])
    }))
  };
}
