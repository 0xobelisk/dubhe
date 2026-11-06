import type {
  SuiMoveAbility,
  SuiMoveModuleId,
  SuiMoveNormalizedFunction,
  SuiMoveNormalizedModules,
  SuiMoveNormalizedType
} from '@mysten/sui/client';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { GrpcTypes, SuiGrpcClient } from '@mysten/sui-v2/grpc';

type Proto = typeof GrpcTypes;

interface Connection<T> {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

interface ModuleInfo {
  name: string;
  fileFormatVersion: number;
  friends: Connection<{ fullyQualifiedName: string }>;
}

type PackageModules<T> = { package: { address: string; modules: Connection<T> } | null };

export function shortMoveAddress(address: string): string {
  return normalizeSuiAddress(address).replace(/^0x0+(?=[a-f0-9])/, '0x');
}

async function query<T>(
  endpoint: string,
  document: string,
  variables: Record<string, string | number | null>,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: document, variables }),
    signal
  });
  if (!response.ok) {
    throw new Error(`Sui GraphQL request failed with HTTP ${response.status}`);
  }
  const result = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (result.errors?.length || !result.data) {
    throw new Error(
      `Sui GraphQL package query failed: ${
        result.errors?.map(({ message }) => message).join('; ') ?? 'no data'
      }`
    );
  }
  return result.data;
}

async function collectPages<T>(
  getPage: (after: string | null) => Promise<Connection<T>>
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;
  do {
    const { nodes, pageInfo } = await getPage(cursor);
    items.push(...nodes);
    if (!pageInfo.hasNextPage) return items;
    if (!pageInfo.endCursor || pageInfo.endCursor === cursor) {
      throw new Error('Sui GraphQL returned an invalid package cursor');
    }
    cursor = pageInfo.endCursor;
  } while (cursor);
  return items;
}

async function getModules<T>(
  endpoint: string,
  packageId: string,
  moduleFields: string,
  signal?: AbortSignal,
  version?: number
): Promise<T[]> {
  const document = `query Modules($id: SuiAddress!, $version: UInt53, $after: String) {
    package(address: $id, version: $version) {
      address
      modules(first: 20, after: $after) {
        nodes { name ${moduleFields} }
        pageInfo { hasNextPage endCursor }
      }
    }
  }`;
  return collectPages(async (after) => {
    const { package: pkg } = await query<PackageModules<T>>(
      endpoint,
      document,
      { id: packageId, version: version ?? null, after },
      signal
    );
    if (!pkg || normalizeSuiAddress(pkg.address) !== normalizeSuiAddress(packageId)) {
      throw new Error(`Package ${packageId} was not found at its exact address in Sui GraphQL`);
    }
    return pkg.modules;
  });
}

async function getFriends(
  endpoint: string,
  packageId: string,
  module: ModuleInfo,
  signal?: AbortSignal,
  version?: number
): Promise<SuiMoveModuleId[]> {
  const document = `query Friends($id: SuiAddress!, $version: UInt53, $name: String!, $after: String) {
    package(address: $id, version: $version) {
      module(name: $name) {
        friends(first: 20, after: $after) {
          nodes { fullyQualifiedName }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }`;
  const friends = await collectPages(async (after) => {
    if (!after) return module.friends;
    const result = await query<{
      package: { module: { friends: ModuleInfo['friends'] } | null } | null;
    }>(
      endpoint,
      document,
      { id: packageId, version: version ?? null, name: module.name, after },
      signal
    );
    if (!result.package?.module) {
      throw new Error(`Sui GraphQL is missing module ${module.name} in package ${packageId}`);
    }
    return result.package.module.friends;
  });
  return friends.map(({ fullyQualifiedName }) => {
    const [address, name] = fullyQualifiedName.split('::');
    return { address: shortMoveAddress(address), name };
  });
}

function normalizeType(
  type: GrpcTypes.OpenSignatureBody | undefined,
  proto: Proto
): SuiMoveNormalizedType {
  const kinds = proto.OpenSignatureBody_Type;
  switch (type?.type) {
    case kinds.ADDRESS:
      return 'Address';
    case kinds.BOOL:
      return 'Bool';
    case kinds.U8:
      return 'U8';
    case kinds.U16:
      return 'U16';
    case kinds.U32:
      return 'U32';
    case kinds.U64:
      return 'U64';
    case kinds.U128:
      return 'U128';
    case kinds.U256:
      return 'U256';
    case kinds.VECTOR:
      return { Vector: normalizeType(type.typeParameterInstantiation[0], proto) };
    case kinds.TYPE_PARAMETER:
      if (type.typeParameter !== undefined) return { TypeParameter: type.typeParameter };
      break;
    case kinds.DATATYPE:
      if (type.typeName) {
        const [address, module, name] = type.typeName.split('::');
        return {
          Struct: {
            address: shortMoveAddress(address),
            module,
            name,
            typeArguments: type.typeParameterInstantiation.map((argument) =>
              normalizeType(argument, proto)
            )
          }
        };
      }
      break;
  }
  throw new Error(`Unsupported Sui gRPC Move signature type ${type?.type}`);
}

function abilities(input: GrpcTypes.Ability[], proto: Proto): { abilities: SuiMoveAbility[] } {
  return {
    abilities: input.map((ability) => {
      switch (ability) {
        case proto.Ability.COPY:
          return 'Copy';
        case proto.Ability.DROP:
          return 'Drop';
        case proto.Ability.STORE:
          return 'Store';
        case proto.Ability.KEY:
          return 'Key';
        default:
          throw new Error(`Unknown Sui gRPC Move ability ${ability}`);
      }
    })
  };
}

export function normalizeFunction(
  fn: GrpcTypes.FunctionDescriptor,
  proto: Proto
): SuiMoveNormalizedFunction {
  const visibility = {
    [proto.FunctionDescriptor_Visibility.PRIVATE]: 'Private',
    [proto.FunctionDescriptor_Visibility.PUBLIC]: 'Public',
    [proto.FunctionDescriptor_Visibility.FRIEND]: 'Friend'
  } as const;
  if (fn.visibility === undefined || !(fn.visibility in visibility)) {
    throw new Error(`Sui gRPC is missing visibility for Move function ${fn.name}`);
  }
  const signature = ({ body, reference }: GrpcTypes.OpenSignature): SuiMoveNormalizedType => {
    const value = normalizeType(body, proto);
    if (reference === proto.OpenSignature_Reference.IMMUTABLE) return { Reference: value };
    if (reference === proto.OpenSignature_Reference.MUTABLE) return { MutableReference: value };
    return value;
  };
  return {
    visibility: visibility[fn.visibility as keyof typeof visibility],
    isEntry: fn.isEntry ?? false,
    parameters: fn.parameters.map(signature),
    return: fn.returns.map(signature),
    typeParameters: fn.typeParameters.map(({ constraints }) => abilities(constraints, proto))
  };
}

export async function loadGrpcMetadata(
  grpc: SuiGrpcClient,
  proto: Proto,
  graphqlEndpoint: string,
  packageId: string,
  signal?: AbortSignal
): Promise<SuiMoveNormalizedModules> {
  const { response } = await grpc.movePackageService.getPackage({ packageId }, { abort: signal });
  const pkg = response.package;
  if (!pkg?.storageId || !pkg.originalId)
    throw new Error(`Sui gRPC is missing package ${packageId}`);
  // The gRPC ABI omits these bytecode details. GraphQL supplies them for the same package version.
  const version = pkg.version === undefined ? undefined : Number(pkg.version);
  const modules = await getModules<ModuleInfo>(
    graphqlEndpoint,
    pkg.storageId,
    'fileFormatVersion friends(first: 20) { nodes { fullyQualifiedName } pageInfo { hasNextPage endCursor } }',
    signal,
    version
  );
  const moduleInfo = new Map(modules.map((module) => [module.name, module]));
  const fields = (input: GrpcTypes.FieldDescriptor[]) =>
    input.map((field) => ({ name: field.name!, type: normalizeType(field.type, proto) }));
  const typeInfo = (dt: GrpcTypes.DatatypeDescriptor) => ({
    abilities: abilities(dt.abilities, proto),
    typeParameters: dt.typeParameters.map(({ constraints, isPhantom }) => ({
      constraints: abilities(constraints, proto),
      isPhantom: isPhantom ?? false
    }))
  });
  return Object.fromEntries(
    await Promise.all(
      pkg.modules.map(async (module) => {
        const name = module.name!;
        const info = moduleInfo.get(name);
        if (!info || !Number.isInteger(info.fileFormatVersion)) {
          throw new Error(`Sui GraphQL is missing bytecode metadata for ${pkg.storageId}::${name}`);
        }
        const structs = Object.fromEntries(
          module.datatypes
            .filter((dt) => dt.kind === proto.DatatypeDescriptor_DatatypeKind.STRUCT)
            .map((dt) => [dt.name!, { ...typeInfo(dt), fields: fields(dt.fields) }])
        );
        const enums = Object.fromEntries(
          module.datatypes
            .filter((dt) => dt.kind === proto.DatatypeDescriptor_DatatypeKind.ENUM)
            .map((dt) => [
              dt.name!,
              {
                ...typeInfo(dt),
                variants: Object.fromEntries(
                  dt.variants.map((variant) => [variant.name!, fields(variant.fields)])
                )
              }
            ])
        );
        const exposedFunctions = Object.fromEntries(
          module.functions
            .filter(
              (fn) =>
                fn.isEntry ||
                fn.visibility === proto.FunctionDescriptor_Visibility.PUBLIC ||
                fn.visibility === proto.FunctionDescriptor_Visibility.FRIEND
            )
            .map((fn) => [fn.name!, normalizeFunction(fn, proto)])
        );
        return [
          name,
          {
            address: shortMoveAddress(pkg.originalId!),
            name,
            fileFormatVersion: info.fileFormatVersion,
            friends: await getFriends(graphqlEndpoint, pkg.storageId!, info, signal, version),
            structs,
            enums,
            exposedFunctions
          }
        ] as const;
      })
    )
  );
}

export async function getPackageDisassembly(
  endpoint: string,
  packageId: string,
  version: bigint,
  signal?: AbortSignal
): Promise<Record<string, string>> {
  const modules = await getModules<{ name: string; disassembly: string | null }>(
    endpoint,
    packageId,
    'disassembly',
    signal,
    Number(version)
  );
  return Object.fromEntries(
    modules.map(({ name, disassembly }) => {
      if (disassembly === null)
        throw new Error(`Sui GraphQL is missing disassembly for ${packageId}::${name}`);
      return [name, disassembly];
    })
  );
}
