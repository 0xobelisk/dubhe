import { DubheConfig, ObjectConfig, Component } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import path from 'node:path';

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map((word) => {
      if (/^\d+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

function getMoveType(t: string): string {
  return t === 'string' || t === 'String' ? 'String' : t;
}

/**
 * Generate typed field accessors (get/set) for an ObjectStorage's own fields.
 * Calls the framework's set_object_field / get_object_field which handle
 * native-type storage and event emission automatically.
 */
// Type token for substitution into generated code
function objStorageType(markerName: string): string {
  return `dubhe::dapp_service::ObjectStorage<${markerName}>`;
}

function generateFieldAccessors(objKey: string, cfg: ObjectConfig): string {
  const markerName = toPascalCase(objKey);
  const storageType = objStorageType(markerName);
  const lines: string[] = [];

  for (const [fieldName, fieldType] of Object.entries(cfg.fields)) {
    const moveType = getMoveType(fieldType as string);

    lines.push(`
    public fun get_${fieldName}(storage: &${storageType}): ${moveType} {
        dubhe::dapp_system::get_object_field<${markerName}, ${moveType}>(storage, b"${fieldName}")
    }

    public(package) fun set_${fieldName}(storage: &mut ${storageType}, value: ${moveType}) {
        dubhe::dapp_system::set_object_field<DappKey, ${markerName}, ${moveType}>(
            dapp_key::new(), storage, b"${fieldName}", value
        );
    }`);
  }

  return lines.join('\n');
}

/**
 * Generate bag accessor functions for a fungible resource accepted by this object.
 * Reads use has_object_field to return a default of 0; writes do a read-modify-write
 * through the framework CRUD API so events are emitted.
 */
function generateFungibleBagAccessors(objKey: string, resourceName: string): string {
  const markerName = toPascalCase(objKey);
  const storageType = objStorageType(markerName);

  return `
    public fun get_${resourceName}(storage: &${storageType}): u64 {
        if (dubhe::dapp_system::has_object_field<${markerName}, u64>(storage, b"${resourceName}")) {
            dubhe::dapp_system::get_object_field<${markerName}, u64>(storage, b"${resourceName}")
        } else { 0 }
    }

    public(package) fun add_${resourceName}(storage: &mut ${storageType}, amount: u64) {
        let current = get_${resourceName}(storage);
        dubhe::dapp_system::set_object_field<DappKey, ${markerName}, u64>(
            dapp_key::new(), storage, b"${resourceName}", current + amount
        );
    }

    public(package) fun sub_${resourceName}(storage: &mut ${storageType}, amount: u64) {
        let current = get_${resourceName}(storage);
        assert!(current >= amount, EInsufficientAmount);
        dubhe::dapp_system::set_object_field<DappKey, ${markerName}, u64>(
            dapp_key::new(), storage, b"${resourceName}", current - amount
        );
    }`;
}

/**
 * Generate bag accessor functions for a unique resource accepted by this object.
 * item_id is BCS-encoded as the Bag key; value is vector<u8> (raw bytes).
 */
function generateUniqueBagAccessors(objKey: string, resourceName: string, idField: string): string {
  const markerName = toPascalCase(objKey);
  const storageType = objStorageType(markerName);

  return `
    public fun has_${resourceName}(storage: &${storageType}, ${idField}: u64): bool {
        let key = sui::bcs::to_bytes(&${idField});
        dubhe::dapp_system::has_object_field<${markerName}, vector<u8>>(storage, key)
    }

    public fun get_${resourceName}_data(storage: &${storageType}, ${idField}: u64): vector<u8> {
        let key = sui::bcs::to_bytes(&${idField});
        dubhe::dapp_system::get_object_field<${markerName}, vector<u8>>(storage, key)
    }

    public(package) fun set_${resourceName}_data(storage: &mut ${storageType}, ${idField}: u64, data: vector<u8>) {
        let key = sui::bcs::to_bytes(&${idField});
        assert!(!dubhe::dapp_system::has_object_field<${markerName}, vector<u8>>(storage, key), EDuplicateItemId);
        dubhe::dapp_system::set_object_field<DappKey, ${markerName}, vector<u8>>(
            dapp_key::new(), storage, key, data
        );
    }

    public(package) fun remove_${resourceName}_data(storage: &mut ${storageType}, ${idField}: u64): vector<u8> {
        let key = sui::bcs::to_bytes(&${idField});
        assert!(dubhe::dapp_system::has_object_field<${markerName}, vector<u8>>(storage, key), EFieldNotFound);
        dubhe::dapp_system::remove_object_field<DappKey, ${markerName}, vector<u8>>(dapp_key::new(), storage, key)
    }`;
}

/**
 * Generate cross-storage transfer functions for acceptsFrom sources.
 * These live in the DESTINATION module and atomically move resources between
 * two ObjectStorage (or SceneStorage) objects.
 */
function generateAcceptsFromTransfers(
  projectName: string,
  destKey: string,
  destAccepts: string[],
  acceptsFrom: string[],
  config: DubheConfig
): { imports: string[]; functions: string[] } {
  const resources = config.resources ?? {};
  const allObjects = config.objects ?? {};
  const allScenes = config.scenes ?? {};

  const destMarker = toPascalCase(destKey);
  const destStorageType = objStorageType(destMarker);
  const imports: string[] = [];
  const functions: string[] = [];

  for (const sourceName of acceptsFrom) {
    const sourceCfg = allObjects[sourceName] ?? allScenes[sourceName];
    if (!sourceCfg) continue;

    const sourceAccepts = sourceCfg.accepts ?? [];
    const sourceMarker = toPascalCase(sourceName);
    // Source may be ObjectStorage or SceneStorage — import just the module
    imports.push(`    use ${projectName}::${sourceName};`);

    const commonResources = sourceAccepts.filter((r) => destAccepts.includes(r));

    for (const resourceName of commonResources) {
      const resCfg = resources[resourceName];
      if (!resCfg || typeof resCfg === 'string') continue;
      const comp = resCfg as Component;

      // Use fully-qualified phantom type to avoid import issues
      const isSourceScene = !!allScenes[sourceName];
      const qualifiedSourceMarker = `${projectName}::${sourceName}::${sourceMarker}`;
      const sourceStorageType = isSourceScene
        ? `dubhe::dapp_service::SceneStorage<${qualifiedSourceMarker}>`
        : `dubhe::dapp_service::ObjectStorage<${qualifiedSourceMarker}>`;

      if (comp.unique && comp.keys?.length) {
        const idField = comp.keys[0];
        functions.push(`
    /// Transfer ${resourceName} (unique item) from ${sourceName} into this ${destKey}.
    public(package) fun transfer_${sourceName}_to_${destKey}_${resourceName}(
        from:       &mut ${sourceStorageType},
        to:         &mut ${destStorageType},
        ${idField}: u64,
    ) {
        let data = ${sourceName}::remove_${resourceName}_data(from, ${idField});
        set_${resourceName}_data(to, ${idField}, data);
    }`);
      } else {
        functions.push(`
    /// Transfer ${resourceName} (fungible) from ${sourceName} into this ${destKey}.
    public(package) fun transfer_${sourceName}_to_${destKey}_${resourceName}(
        from:   &mut ${sourceStorageType},
        to:     &mut ${destStorageType},
        amount: u64,
    ) {
        ${sourceName}::sub_${resourceName}(from, amount);
        add_${resourceName}(to, amount);
    }`);
      }
    }
  }

  return { imports, functions };
}

export async function generateObjects(config: DubheConfig, outputDir: string) {
  if (!config.objects || Object.keys(config.objects).length === 0) return;
  console.log('\n📦 Starting Object Storage Generation...');

  const projectName = config.name;
  const resources = config.resources ?? {};

  for (const [objKey, objCfg] of Object.entries(config.objects)) {
    console.log(`     └─ ${objKey}`);
    const markerName = toPascalCase(objKey);
    const storageAlias = `${markerName}Storage`;
    const typeTag = `b"${objKey}"`;

    // Own field accessors (framework CRUD calls)
    const fieldAccessors = generateFieldAccessors(objKey, objCfg);

    // Bag accessors for accepted resources
    const acceptedResources = objCfg.accepts ?? [];
    const bagAccessorParts: string[] = [];
    for (const resourceName of acceptedResources) {
      const resCfg = resources[resourceName];
      if (!resCfg || typeof resCfg === 'string') continue;
      const comp = resCfg as Component;
      if (comp.unique && comp.keys?.length) {
        bagAccessorParts.push(generateUniqueBagAccessors(objKey, resourceName, comp.keys[0]));
      } else {
        bagAccessorParts.push(generateFungibleBagAccessors(objKey, resourceName));
      }
    }

    // acceptsFrom: cross-storage transfer functions
    const { imports: afImports, functions: afFunctions } = generateAcceptsFromTransfers(
      projectName,
      objKey,
      acceptedResources,
      objCfg.acceptsFrom ?? [],
      config
    );

    // adminOnly check for create
    const adminCheck = objCfg.adminOnly
      ? `        assert!(ctx.sender() == dubhe::dapp_service::dapp_admin(dapp_storage), ENoPermission);`
      : '';

    const fullStorageTypeLocal = `dubhe::dapp_service::ObjectStorage<${markerName}>`;

    // assert_<key>_id helper (reads entity_id via framework accessor)
    const assertIdFn = `
    public fun assert_${objKey}_id(storage: &${fullStorageTypeLocal}, expected: vector<u8>) {
        assert!(*dubhe::dapp_service::object_storage_entity_id(storage) == expected, EWrongEntityId);
    }`;

    // entity_id accessor
    const entityIdFn = `
    public fun entity_id(storage: &${fullStorageTypeLocal}): vector<u8> {
        *dubhe::dapp_service::object_storage_entity_id(storage)
    }`;

    // Conditional String import: needed when own fields or String-typed accepts are used
    const ownFieldTypes = Object.values(objCfg.fields) as string[];
    const needsStringImport = ownFieldTypes.some(
      (t) => t === 'string' || t === 'String' || t === 'vector<String>'
    );
    const stringImport = needsStringImport ? `\n    use std::ascii::String;` : '';

    // Conditional error constants
    const hasUniqueAccepts = acceptedResources.some((r) => {
      const rc = resources[r];
      if (!rc || typeof rc === 'string') return false;
      return !!((rc as Component).unique && (rc as Component).keys?.length);
    });
    const hasFungibleAccepts = acceptedResources.some((r) => {
      const rc = resources[r];
      if (!rc || typeof rc === 'string') return false;
      return !!(rc as Component).fungible;
    });
    // EFieldNotFound is only used in remove_*_data for unique bag accessors
    const objNeedsFieldNotFound = hasUniqueAccepts;
    const objNeedsInsufficient = hasFungibleAccepts;
    const objNeedsDuplicate = hasUniqueAccepts;
    const objNeedsNoPermission = !!objCfg.adminOnly;

    const errorConstants = [
      objNeedsFieldNotFound
        ? `    #[error]\n    const EFieldNotFound: vector<u8> = b"Field not found";`
        : '',
      objNeedsInsufficient
        ? `    #[error]\n    const EInsufficientAmount: vector<u8> = b"Insufficient amount";`
        : '',
      objNeedsDuplicate
        ? `    #[error]\n    const EDuplicateItemId: vector<u8> = b"Duplicate item id";`
        : '',
      `    #[error]\n    const EWrongEntityId: vector<u8> = b"Wrong entity id";`,
      objNeedsNoPermission
        ? `    #[error]\n    const ENoPermission: vector<u8> = b"Caller does not have permission";`
        : ''
    ]
      .filter(Boolean)
      .join('\n');

    const afImportBlock = afImports.length > 0 ? '\n' + afImports.join('\n') : '';

    // Use the full framework type name for all function signatures.
    // Move type aliases (public type) are not yet supported in this Sui version,
    // so we use ObjectStorage<Marker> directly.
    const fullStorageType = `dubhe::dapp_service::ObjectStorage<${markerName}>`;

    const code = `module ${projectName}::${objKey} {
    use dubhe::dapp_service::DappStorage;
    use ${projectName}::dapp_key;
    use ${projectName}::dapp_key::DappKey;${stringImport}${afImportBlock}

    // ─── Error constants ───────────────────────────────────────────────────
${errorConstants}

    const TYPE_TAG: vector<u8> = ${typeTag};

    // ─── Phantom marker type ───────────────────────────────────────────────
    /// Phantom type that distinguishes ${storageAlias} from other ObjectStorage types
    /// at the Move compiler level, preserving compile-time type safety.
    /// All functions use ObjectStorage<${markerName}> directly in their signatures.
    public struct ${markerName} has copy, drop {}

    // ─── ID / entity accessors ─────────────────────────────────────────────
${entityIdFn}

${assertIdFn}

    // ─── Field accessors (own fields) ──────────────────────────────────────
${fieldAccessors}

    // ─── Bag accessors for accepted resources ─────────────────────────────
${bagAccessorParts.join('\n')}

    // ─── acceptsFrom: cross-storage transfer functions ─────────────────────
${afFunctions.join('\n')}

    // ─── Lifecycle entry functions ─────────────────────────────────────────
    public fun create_${objKey}(
        dapp_storage: &mut DappStorage,
        entity_id:    vector<u8>,
        ctx:          &mut TxContext,
    ) {
${adminCheck}
        dubhe::dapp_system::create_and_share_typed_object<DappKey, ${markerName}>(
            dapp_key::new(), dapp_storage, TYPE_TAG, entity_id, ctx
        );
    }

    public fun destroy_${objKey}(
        dapp_storage: &mut DappStorage,
        storage:      ${fullStorageType},
        _ctx:         &TxContext,
    ) {
        dubhe::dapp_system::destroy_typed_object<DappKey, ${markerName}>(
            dapp_key::new(), dapp_storage, storage
        );
    }
}
`;

    await formatAndWriteMove(code, path.join(outputDir, `${objKey}.move`), 'formatAndWriteMove');
  }
}
