import type {
  MoveStruct,
  ObjectOwner,
  SuiObjectData,
  SuiObjectDataOptions
} from '@mysten/sui/client';
import { normalizeSuiAddress, toBase64 } from '@mysten/sui/utils';
import type { GrpcTypes } from '@mysten/sui-v2/grpc';
import { getPackageDisassembly } from './grpcMetadata';

type Proto = typeof GrpcTypes;

export function legacyObjectType(type: string): string {
  // Sui JSON-RPC shortens only its system addresses, retaining leading zeros elsewhere.
  return type.replace(/\b0x0+([0-3]|[56]|dee9)(?=::)/gi, '0x$1').replace(/,\s*/g, ', ');
}

export function objectFields(options: SuiObjectDataOptions = {}): string[] {
  const fields = ['object_id', 'version', 'digest'];
  if (options.showType || options.showContent || options.showBcs) fields.push('object_type');
  if (options.showOwner) fields.push('owner');
  if (options.showContent || options.showBcs) fields.push('has_public_transfer');
  if (options.showContent) fields.push('json');
  if (options.showBcs) fields.push('contents', 'package');
  if (options.showDisplay) fields.push('display');
  if (options.showPreviousTransaction) fields.push('previous_transaction');
  if (options.showStorageRebate) fields.push('storage_rebate');
  return fields;
}

export function normalizeOwner(owner: GrpcTypes.Owner, proto: Proto): ObjectOwner {
  switch (owner.kind) {
    case proto.Owner_OwnerKind.ADDRESS:
      if (owner.address) return { AddressOwner: owner.address };
      break;
    case proto.Owner_OwnerKind.OBJECT:
      if (owner.address) return { ObjectOwner: owner.address };
      break;
    case proto.Owner_OwnerKind.SHARED:
      if (owner.version !== undefined)
        return { Shared: { initial_shared_version: owner.version.toString() } };
      break;
    case proto.Owner_OwnerKind.IMMUTABLE:
      return 'Immutable';
    case proto.Owner_OwnerKind.CONSENSUS_ADDRESS:
      if (owner.address && owner.version !== undefined) {
        return {
          ConsensusV2: {
            authenticator: { SingleOwner: owner.address },
            start_version: owner.version.toString()
          }
        };
      }
      break;
  }
  throw new Error(`Unsupported or incomplete Sui gRPC owner kind ${owner.kind}`);
}

export function objectJson(value: GrpcTypes.Object['json'], proto: Proto): unknown {
  return (proto.Object.toJson({ json: value }) as { json?: unknown }).json;
}

function packageBcs(
  pkg: GrpcTypes.Package | undefined,
  id: string,
  version: string
): Extract<NonNullable<SuiObjectData['bcs']>, { dataType: 'package' }> {
  if (!pkg || pkg.modules.some((module) => !module.name || !module.contents)) {
    throw new Error(`Sui gRPC is missing bytecode for package ${id}`);
  }
  return {
    dataType: 'package',
    id,
    version,
    moduleMap: Object.fromEntries(
      pkg.modules.map(({ name, contents }) => [name!, toBase64(contents!)])
    ),
    typeOriginTable: pkg.typeOrigins.map((origin) => ({
      module_name: origin.moduleName!,
      datatype_name: origin.datatypeName!,
      package: origin.packageId!
    })),
    linkageTable: Object.fromEntries(
      pkg.linkage.map((link) => [
        link.originalId!,
        { upgraded_id: link.upgradedId!, upgraded_version: link.upgradedVersion!.toString() }
      ])
    )
  };
}

export async function normalizeObject(
  object: GrpcTypes.Object,
  options: SuiObjectDataOptions,
  proto: Proto,
  graphqlEndpoint: string,
  signal?: AbortSignal
): Promise<SuiObjectData> {
  const { objectId, digest, version, objectType, hasPublicTransfer } = object;
  if (!objectId || !digest || version === undefined) {
    throw new Error('Sui gRPC returned an incomplete object reference');
  }
  const data: SuiObjectData = { objectId, digest, version: version.toString() };
  const type = objectType && legacyObjectType(objectType);
  if (options.showType) data.type = type ?? null;
  if (options.showOwner) data.owner = object.owner ? normalizeOwner(object.owner, proto) : null;
  if (options.showPreviousTransaction)
    data.previousTransaction = object.previousTransaction ?? null;
  if (options.showStorageRebate) data.storageRebate = object.storageRebate?.toString() ?? null;
  if (options.showBcs) {
    if (objectType === 'package') {
      data.bcs = packageBcs(object.package, objectId, data.version);
    } else {
      if (!type || !object.contents?.value || hasPublicTransfer === undefined) {
        throw new Error(`Sui gRPC is missing BCS contents for object ${objectId}`);
      }
      data.bcs = {
        dataType: 'moveObject',
        type,
        hasPublicTransfer,
        version: data.version,
        bcsBytes: toBase64(object.contents.value)
      };
    }
  }
  if (options.showContent) {
    if (objectType === 'package') {
      data.content = {
        dataType: 'package',
        disassembled: await getPackageDisassembly(graphqlEndpoint, objectId, version, signal)
      };
    } else {
      const value = objectJson(object.json, proto);
      if (
        !type ||
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        hasPublicTransfer === undefined
      ) {
        throw new Error(`Sui gRPC is missing parsed contents for object ${objectId}`);
      }
      const fields = value as Record<string, unknown>;
      if (typeof fields.id === 'string' && normalizeSuiAddress(fields.id) === objectId) {
        // A key object's UID is flattened by gRPC. Keep the legacy outer UID shape.
        fields.id = { id: objectId };
      }
      data.content = {
        dataType: 'moveObject',
        type,
        fields: fields as MoveStruct,
        hasPublicTransfer
      };
    }
  }
  if (options.showDisplay) {
    const output = objectJson(object.display?.output, proto);
    const errors = objectJson(object.display?.errors, proto);
    data.display = {
      data:
        output && typeof output === 'object'
          ? Object.fromEntries(
              Object.entries(output).filter(([, value]) => typeof value === 'string')
            )
          : null,
      error: errors ? { code: 'displayError', error: JSON.stringify(errors) } : null
    };
  }
  return data;
}
