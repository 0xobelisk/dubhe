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

/** Generate the bag key used for a resource stored inside an ObjectStorage bag. */
function bagKey(resourceName: string): string {
  return `b"${resourceName}"`;
}

/**
 * Generate field accessors (get/set) for the ObjectStorage's own fields.
 * These are stored in the Bag under the field name as the key.
 */
function generateFieldAccessors(projectName: string, objKey: string, cfg: ObjectConfig): string {
  const structName = `${toPascalCase(objKey)}Storage`;
  const lines: string[] = [];

  for (const [fieldName, fieldType] of Object.entries(cfg.fields)) {
    const moveType = getMoveType(fieldType as string);
    const bagKeyExpr = `b"${fieldName}"`;

    lines.push(`
    public fun get_${fieldName}(storage: &${structName}): ${moveType} {
        assert!(sui::bag::contains(&storage.data, ${bagKeyExpr}), EFieldNotFound);
        *sui::bag::borrow<vector<u8>, ${moveType}>(&storage.data, ${bagKeyExpr})
    }

    public(package) fun set_${fieldName}(storage: &mut ${structName}, value: ${moveType}) {
        if (sui::bag::contains(&storage.data, ${bagKeyExpr})) {
            *sui::bag::borrow_mut<vector<u8>, ${moveType}>(&mut storage.data, ${bagKeyExpr}) = value;
        } else {
            sui::bag::add(&mut storage.data, ${bagKeyExpr}, value);
        }
    }`);
  }

  return lines.join('\n');
}

/**
 * Generate bag accessor functions for a fungible resource accepted by this object.
 * e.g. gold accepted by guild → add_gold / sub_gold / get_gold in guild module.
 */
function generateFungibleBagAccessors(objKey: string, resourceName: string): string {
  const structName = `${toPascalCase(objKey)}Storage`;
  const k = bagKey(resourceName);

  return `
    public fun get_${resourceName}(storage: &${structName}): u64 {
        if (sui::bag::contains(&storage.data, ${k})) {
            *sui::bag::borrow<vector<u8>, u64>(&storage.data, ${k})
        } else { 0 }
    }

    public(package) fun add_${resourceName}(storage: &mut ${structName}, amount: u64) {
        if (sui::bag::contains(&storage.data, ${k})) {
            let current: &mut u64 = sui::bag::borrow_mut(&mut storage.data, ${k});
            *current = *current + amount;
        } else {
            sui::bag::add(&mut storage.data, ${k}, amount);
        }
    }

    public(package) fun sub_${resourceName}(storage: &mut ${structName}, amount: u64) {
        assert!(sui::bag::contains(&storage.data, ${k}), EInsufficientAmount);
        let current: &mut u64 = sui::bag::borrow_mut(&mut storage.data, ${k});
        assert!(*current >= amount, EInsufficientAmount);
        *current = *current - amount;
    }`;
}

/**
 * Generate bag accessor functions for a unique resource accepted by this object.
 * item_id is the key; value is stored as BCS bytes.
 */
function generateUniqueBagAccessors(objKey: string, resourceName: string, idField: string): string {
  const structName = `${toPascalCase(objKey)}Storage`;

  return `
    public fun has_${resourceName}(storage: &${structName}, ${idField}: u64): bool {
        let key = sui::bcs::to_bytes(&${idField});
        sui::bag::contains_with_type<vector<u8>, vector<u8>>(&storage.data, key)
    }

    public fun get_${resourceName}_data(storage: &${structName}, ${idField}: u64): vector<u8> {
        let key = sui::bcs::to_bytes(&${idField});
        assert!(sui::bag::contains(&storage.data, key), EFieldNotFound);
        *sui::bag::borrow<vector<u8>, vector<u8>>(&storage.data, key)
    }

    public(package) fun set_${resourceName}_data(storage: &mut ${structName}, ${idField}: u64, data: vector<u8>) {
        let key = sui::bcs::to_bytes(&${idField});
        assert!(!sui::bag::contains(&storage.data, key), EDuplicateItemId);
        sui::bag::add(&mut storage.data, key, data);
    }

    public(package) fun remove_${resourceName}_data(storage: &mut ${structName}, ${idField}: u64): vector<u8> {
        let key = sui::bcs::to_bytes(&${idField});
        assert!(sui::bag::contains(&storage.data, key), EFieldNotFound);
        sui::bag::remove(&mut storage.data, key)
    }`;
}

/**
 * Generate cross-storage transfer functions for acceptsFrom sources.
 *
 * For each source listed in `objCfg.acceptsFrom`, find the intersection of
 * source.accepts ∩ dest.accepts and emit one transfer function per resource:
 *
 *   public(package) fun transfer_<source>_to_<dest>_<resource>(
 *       from: &mut <SourceStorage>, to: &mut <DestStorage>, ...
 *   )
 *
 * These live in the DESTINATION module.  Because all generated modules share the
 * same package address, calling `public(package)` functions across modules within
 * the same project is allowed by Move.
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

  const destStructName = `${toPascalCase(destKey)}Storage`;
  const imports: string[] = [];
  const functions: string[] = [];

  for (const sourceName of acceptsFrom) {
    const sourceCfg = allObjects[sourceName] ?? allScenes[sourceName];
    if (!sourceCfg) continue;

    const sourceAccepts = sourceCfg.accepts ?? [];
    const SourceStruct = `${toPascalCase(sourceName)}Storage`;

    // Import both the module alias (for function calls) and the struct type.
    // `Self` brings the module into scope so `sourceName::sub_resource(...)` resolves.
    imports.push(`    use ${projectName}::${sourceName}::{Self, ${SourceStruct}};`);

    // Transfer only resources that both sides handle.
    const commonResources = sourceAccepts.filter((r) => destAccepts.includes(r));

    for (const resourceName of commonResources) {
      const resCfg = resources[resourceName];
      if (!resCfg || typeof resCfg === 'string') continue;
      const comp = resCfg as Component;

      if (comp.unique && comp.keys?.length) {
        const idField = comp.keys[0];
        functions.push(`
    /// Transfer ${resourceName} (unique item) from ${sourceName} into this ${destKey}.
    /// The item is atomically removed from the source Bag and inserted into the dest Bag.
    public(package) fun transfer_${sourceName}_to_${destKey}_${resourceName}(
        from:       &mut ${SourceStruct},
        to:         &mut ${destStructName},
        ${idField}: u64,
    ) {
        let data = ${sourceName}::remove_${resourceName}_data(from, ${idField});
        set_${resourceName}_data(to, ${idField}, data);
    }`);
      } else {
        // fungible
        functions.push(`
    /// Transfer ${resourceName} (fungible) from ${sourceName} into this ${destKey}.
    public(package) fun transfer_${sourceName}_to_${destKey}_${resourceName}(
        from:   &mut ${SourceStruct},
        to:     &mut ${destStructName},
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
    const structName = `${toPascalCase(objKey)}Storage`;
    const typeTag = `b"${objKey}"`;

    // Own field accessors
    const fieldAccessors = generateFieldAccessors(projectName, objKey, objCfg);

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

    // Generate assert_<key>_id helper
    const assertIdFn = `
    public fun assert_${objKey}_id(storage: &${structName}, expected: vector<u8>) {
        assert!(storage.entity_id == expected, EWrongEntityId);
    }`;

    // Conditionally add std::ascii import when any own field uses String type
    const ownFieldTypes = Object.values(objCfg.fields) as string[];
    const needsStringImport = ownFieldTypes.some(
      (t) => t === 'string' || t === 'String' || t === 'vector<String>'
    );
    const stringImport = needsStringImport ? `\n    use std::ascii::{string, String};` : '';

    // Extra imports from acceptsFrom
    const afImportBlock = afImports.length > 0 ? '\n' + afImports.join('\n') : '';

    const code = `module ${projectName}::${objKey} {
    use sui::bag::{Self, Bag};
    use dubhe::dapp_service::{DappStorage, UserStorage};
    use dubhe::dapp_system;
    use ${projectName}::dapp_key;
    use ${projectName}::dapp_key::DappKey;${stringImport}${afImportBlock}

    // ─── Error constants ───────────────────────────────────────────────────
    const EFieldNotFound: u64 = 1;
    const EInsufficientAmount: u64 = 2;
    const EDuplicateItemId: u64 = 3;
    const EWrongEntityId: u64 = 4;
    const ENoPermission: u64 = 5;

    const TYPE_TAG: vector<u8> = ${typeTag};

    // ─── Struct definition ─────────────────────────────────────────────────
    /// Typed shared object for DApp-managed entity: ${objKey}.
    /// entity_id is unique within this type across the DApp.
    public struct ${structName} has key {
        id:        sui::object::UID,
        entity_id: vector<u8>,
        data:      Bag,
    }

    // ─── ID accessor ───────────────────────────────────────────────────────
    public fun entity_id(storage: &${structName}): vector<u8> { storage.entity_id }

${assertIdFn}

    // ─── Field accessors (own fields) ──────────────────────────────────────
${fieldAccessors}

    // ─── Bag accessors for accepted resources ─────────────────────────────
${bagAccessorParts.join('\n')}

    // ─── acceptsFrom: cross-storage transfer functions ─────────────────────
${afFunctions.join('\n')}

    // ─── Lifecycle entry functions ─────────────────────────────────────────
    public entry fun create_${objKey}(
        dapp_storage: &mut DappStorage,
        entity_id:    vector<u8>,
        ctx:          &mut TxContext,
    ) {
${adminCheck}
        let id = sui::object::new(ctx);
        let object_id = sui::object::uid_to_address(&id);
        dapp_system::register_object_entity<DappKey>(
            dapp_key::new(), dapp_storage, TYPE_TAG, entity_id, object_id
        );
        let storage = ${structName} {
            id,
            entity_id,
            data:      bag::new(ctx),
        };
        sui::transfer::share_object(storage);
    }

    public entry fun destroy_${objKey}(
        dapp_storage: &mut DappStorage,
        storage:      ${structName},
        _ctx:         &mut TxContext,
    ) {
        let ${structName} { id, entity_id, data } = storage;
        bag::destroy_empty(data);
        dapp_system::unregister_object_entity<DappKey>(
            dapp_key::new(), dapp_storage, TYPE_TAG, entity_id
        );
        sui::object::delete(id);
    }
}
`;

    await formatAndWriteMove(code, path.join(outputDir, `${objKey}.move`), 'formatAndWriteMove');
  }
}
