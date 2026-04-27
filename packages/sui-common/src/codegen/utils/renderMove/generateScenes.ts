import { DubheConfig, SceneConfig, Component } from '../../types';
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

function bagKey(resourceName: string): string {
  return `b"${resourceName}"`;
}

function generateFieldAccessors(objKey: string, cfg: SceneConfig): string {
  const structName = `${toPascalCase(objKey)}Storage`;
  const lines: string[] = [];

  for (const [fieldName, fieldType] of Object.entries(cfg.fields)) {
    const moveType = getMoveType(fieldType as string);
    const k = `b"${fieldName}"`;

    lines.push(`
    public fun get_${fieldName}(storage: &${structName}): ${moveType} {
        assert!(sui::bag::contains(&storage.data, ${k}), EFieldNotFound);
        *sui::bag::borrow<vector<u8>, ${moveType}>(&storage.data, ${k})
    }

    public(package) fun set_${fieldName}(storage: &mut ${structName}, value: ${moveType}) {
        if (sui::bag::contains(&storage.data, ${k})) {
            *sui::bag::borrow_mut<vector<u8>, ${moveType}>(&mut storage.data, ${k}) = value;
        } else {
            sui::bag::add(&mut storage.data, ${k}, value);
        }
    }`);
  }

  return lines.join('\n');
}

function generateFungibleBagAccessors(sceneKey: string, resourceName: string): string {
  const structName = `${toPascalCase(sceneKey)}Storage`;
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

function generateUniqueBagAccessors(
  sceneKey: string,
  resourceName: string,
  idField: string
): string {
  const structName = `${toPascalCase(sceneKey)}Storage`;

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
 * For each source listed in sceneCfg.acceptsFrom, find the intersection of
 * source.accepts ∩ dest.accepts and emit one transfer function per resource:
 *
 *   public(package) fun transfer_<source>_to_<dest>_<resource>(
 *       from: &mut <SourceStorage>, to: &mut <DestStorage>, ...
 *   )
 *
 * These live in the DESTINATION module. Because all generated modules share
 * the same package address, public(package) calls across modules are allowed.
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

    const commonResources = sourceAccepts.filter((r) => destAccepts.includes(r));

    for (const resourceName of commonResources) {
      const resCfg = resources[resourceName];
      if (!resCfg || typeof resCfg === 'string') continue;
      const comp = resCfg as Component;

      if (comp.unique && comp.keys?.length) {
        const idField = comp.keys[0];
        functions.push(`
    /// Transfer ${resourceName} (unique item) from ${sourceName} into this ${destKey}.
    public(package) fun transfer_${sourceName}_to_${destKey}_${resourceName}(
        from:       &mut ${SourceStruct},
        to:         &mut ${destStructName},
        ${idField}: u64,
    ) {
        let data = ${sourceName}::remove_${resourceName}_data(from, ${idField});
        set_${resourceName}_data(to, ${idField}, data);
    }`);
      } else {
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

export async function generateScenes(config: DubheConfig, outputDir: string) {
  if (!config.scenes || Object.keys(config.scenes).length === 0) return;
  console.log('\n📦 Starting Scene Storage Generation...');

  const projectName = config.name;
  const resources = config.resources ?? {};

  for (const [sceneKey, sceneCfg] of Object.entries(config.scenes)) {
    console.log(`     └─ ${sceneKey}`);
    const structName = `${toPascalCase(sceneKey)}Storage`;

    const fieldAccessors = generateFieldAccessors(sceneKey, sceneCfg);

    const acceptedResources = sceneCfg.accepts ?? [];
    const bagAccessorParts: string[] = [];
    for (const resourceName of acceptedResources) {
      const resCfg = resources[resourceName];
      if (!resCfg || typeof resCfg === 'string') continue;
      const comp = resCfg as Component;
      if (comp.unique && comp.keys?.length) {
        bagAccessorParts.push(generateUniqueBagAccessors(sceneKey, resourceName, comp.keys[0]));
      } else {
        bagAccessorParts.push(generateFungibleBagAccessors(sceneKey, resourceName));
      }
    }

    // acceptsFrom: cross-storage transfer functions
    const { imports: afImports, functions: afFunctions } = generateAcceptsFromTransfers(
      projectName,
      sceneKey,
      acceptedResources,
      sceneCfg.acceptsFrom ?? [],
      config
    );

    // SceneMetadata accessor helpers
    const metaAccessors = `
    /// Expose the embedded SceneMetadata for reactive writes and join/expire checks.
    public fun meta(storage: &${structName}): &dubhe::dapp_service::SceneMetadata {
        &storage.meta
    }

    public(package) fun meta_mut(storage: &mut ${structName}): &mut dubhe::dapp_service::SceneMetadata {
        &mut storage.meta
    }

    public fun is_active(storage: &${structName}, now_ms: u64): bool {
        dubhe::dapp_service::is_scene_active(&storage.meta, now_ms)
    }

    public fun is_participant(storage: &${structName}, addr: address): bool {
        dubhe::dapp_service::is_scene_participant(&storage.meta, addr)
    }`;

    // Conditionally add std::ascii import when any own field uses String type
    const sceneFieldTypes = Object.values(sceneCfg.fields) as string[];
    const sceneNeedsStringImport = sceneFieldTypes.some(
      (t) => t === 'string' || t === 'String' || t === 'vector<String>'
    );
    const sceneStringImport = sceneNeedsStringImport
      ? `\n    use std::ascii::{string, String};`
      : '';

    // Extra imports from acceptsFrom
    const afImportBlock = afImports.length > 0 ? '\n' + afImports.join('\n') : '';

    const code = `module ${projectName}::${sceneKey} {
    use sui::bag::{Self, Bag};
    use dubhe::dapp_service::{Self, DappStorage, UserStorage, SceneMetadata};
    use dubhe::dapp_system;
    use ${projectName}::dapp_key;
    use ${projectName}::dapp_key::DappKey;
    use sui::ed25519;${sceneStringImport}${afImportBlock}

    // ─── Error constants ───────────────────────────────────────────────────
    const EFieldNotFound: u64 = 1;
    const EInsufficientAmount: u64 = 2;
    const EDuplicateItemId: u64 = 3;
    const ENotParticipant: u64 = 4;
    const ESceneExpired: u64 = 5;

    // ─── Struct definition ─────────────────────────────────────────────────
    /// Typed shared scene object for: ${sceneKey}.
    /// Embeds SceneMetadata used for reactive write authorization.
    public struct ${structName} has key {
        id:   sui::object::UID,
        meta: SceneMetadata,
        data: Bag,
    }

${metaAccessors}

    // ─── Field accessors (own fields) ──────────────────────────────────────
${fieldAccessors}

    // ─── Bag accessors for accepted resources ─────────────────────────────
${bagAccessorParts.join('\n')}

    // ─── acceptsFrom: cross-storage transfer functions ─────────────────────
${afFunctions.join('\n')}

    // ─── Scene lifecycle entry functions ───────────────────────────────────

    /// Create a scene with off-chain multi-sig consent from all n participants.
    public entry fun create_${sceneKey}_with_consent(
        dapp_storage: &mut DappStorage,
        participants: vector<address>,
        sigs:         vector<vector<u8>>,
        pubkeys:      vector<vector<u8>>,
        nonce:        u64,
        expires_at:   u64,
        ctx:          &mut TxContext,
    ) {
        dapp_system::consume_nonce<DappKey>(dapp_key::new(), dapp_storage, nonce);
        assert!(ctx.epoch_timestamp_ms() <= expires_at, ESceneExpired);

        let msg = encode_consent_msg(&participants, nonce, expires_at);
        let n = participants.length();
        assert!(sigs.length() == n, 0);
        assert!(pubkeys.length() == n, 0);

        let mut i = 0;
        while (i < n) {
            let pk  = *pubkeys.borrow(i);
            let sig = *sigs.borrow(i);
            assert!(ed25519::ed25519_verify(&sig, &pk, &msg), ENotParticipant);
            i = i + 1;
        };

        let scene = ${structName} {
            id:   sui::object::new(ctx),
            meta: dapp_system::new_scene_meta(
                participants,
                std::option::some(expires_at),
            ),
            data: bag::new(ctx),
        };
        sui::transfer::share_object(scene);
    }

    /// Dynamically join an open scene (no consent needed — scene must not have expired).
    public entry fun join_${sceneKey}(
        storage: &mut ${structName},
        ctx:     &mut TxContext,
    ) {
        assert!(dapp_service::is_scene_active(&storage.meta, ctx.epoch_timestamp_ms()), ESceneExpired);
        dapp_service::add_scene_participant(&mut storage.meta, ctx.sender());
    }

    /// Expire and destroy a scene once its deadline has passed.
    /// The scene's Bag must be empty before this can succeed.
    public entry fun expire_${sceneKey}(
        storage: ${structName},
        ctx:     &TxContext,
    ) {
        assert!(!dapp_service::is_scene_active(&storage.meta, ctx.epoch_timestamp_ms()), ESceneExpired);
        let ${structName} { id, meta: _, data } = storage;
        bag::destroy_empty(data);
        sui::object::delete(id);
    }

    // ─── Internal helpers ──────────────────────────────────────────────────

    fun encode_consent_msg(participants: &vector<address>, nonce: u64, expires_at: u64): vector<u8> {
        let mut msg = vector::empty<u8>();
        let p_bytes = sui::bcs::to_bytes(participants);
        let n_bytes = sui::bcs::to_bytes(&nonce);
        let e_bytes = sui::bcs::to_bytes(&expires_at);
        msg.append(p_bytes);
        msg.append(n_bytes);
        msg.append(e_bytes);
        msg
    }
}
`;

    await formatAndWriteMove(code, path.join(outputDir, `${sceneKey}.move`), 'formatAndWriteMove');
  }
}
