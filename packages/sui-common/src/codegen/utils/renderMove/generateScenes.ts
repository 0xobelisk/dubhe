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

    // When adminOnly is true, create functions are package-scoped so that only
    // DApp system functions (which can enforce admin checks) can create scenes.
    const createVisibility = sceneCfg.adminOnly ? 'public(package)' : 'public';

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
        dubhe::dapp_service::is_scene_participant(&storage.id, addr)
    }`;

    // Conditionally add std::ascii import when any own field uses String type
    const sceneFieldTypes = Object.values(sceneCfg.fields) as string[];
    const sceneNeedsStringImport = sceneFieldTypes.some(
      (t) => t === 'string' || t === 'String' || t === 'vector<String>'
    );
    const sceneStringImport = sceneNeedsStringImport
      ? `\n    use std::ascii::{string, String};`
      : '';

    // Whether any unique bag accessors are generated (EDuplicateItemId needed only then)
    const hasUniqueBagAccessors = acceptedResources.some((resourceName) => {
      const resCfg = resources[resourceName];
      if (!resCfg || typeof resCfg === 'string') return false;
      const comp = resCfg as Component;
      return !!(comp.unique && comp.keys?.length);
    });
    // Whether any fungible bag accessors are generated (EInsufficientAmount needed only then)
    const hasFungibleBagAccessors = acceptedResources.some((resourceName) => {
      const resCfg = resources[resourceName];
      if (!resCfg || typeof resCfg === 'string') return false;
      const comp = resCfg as Component;
      return !!comp.fungible;
    });
    // EFieldNotFound: needed for own field getters OR unique bag get/remove accessors
    const hasOwnFields = Object.keys(sceneCfg.fields).length > 0;
    const needsFieldNotFound = hasOwnFields || hasUniqueBagAccessors;

    // Extra imports from acceptsFrom
    const afImportBlock = afImports.length > 0 ? '\n' + afImports.join('\n') : '';

    const duplicateItemIdConst = hasUniqueBagAccessors
      ? `\n    #[error]\n    const EDuplicateItemId: vector<u8> = b"Duplicate item id";`
      : '';
    const fieldNotFoundConst = needsFieldNotFound
      ? `    #[error]\n    const EFieldNotFound: vector<u8> = b"Field not found";\n`
      : '';
    const insufficientAmountConst = hasFungibleBagAccessors
      ? `    #[error]\n    const EInsufficientAmount: vector<u8> = b"Insufficient amount";`
      : '';

    const code = `module ${projectName}::${sceneKey} {
    use sui::bag::{Self, Bag};
    use dubhe::dapp_service::{Self, SceneMetadata};
    use dubhe::dapp_system;
    use ${projectName}::dapp_key;
    use ${projectName}::dapp_key::DappKey;${sceneStringImport}${afImportBlock}

    // ─── Error constants ───────────────────────────────────────────────────
    ${fieldNotFoundConst}${insufficientAmountConst}${duplicateItemIdConst}
    #[error]
    const ESceneExpired: vector<u8> = b"Scene has expired";
    #[error]
    const ESceneNotExpiredYet: vector<u8> = b"Scene is still active and cannot be destroyed yet";

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

    /// Create an open scene without consent signatures.
    /// participants can be empty — use join_${sceneKey} to add dynamically.
    /// expires_at is optional: pass none() for a scene that never auto-expires.
    /// max_participants caps the participant list size; pass none() for unlimited.
    /// Access control (e.g. admin-only) must be enforced in the calling system function.
    ${createVisibility} fun create_${sceneKey}(
        participants:     vector<address>,
        expires_at:       std::option::Option<u64>,
        max_participants: std::option::Option<u64>,
        ctx:              &mut TxContext,
    ) {
        let mut id = sui::object::new(ctx);
        let meta = dapp_system::init_scene_meta(&mut id, participants, expires_at, max_participants);
        let scene = ${structName} { id, meta, data: bag::new(ctx) };
        sui::transfer::share_object(scene);
    }

    /// Create a scene with an invitation list — supports ALL Sui wallet types
    /// including zkLogin, multisig, Passkey, and Ed25519.
    ///
    /// Each invitee must call accept_${sceneKey} from their own wallet to confirm.
    /// The scene becomes usable for reactive writes only after a participant has
    /// accepted.  Invitations optionally expire at invites_expire_at (epoch ms).
    /// The scene itself optionally expires at scene_expires_at.
    /// max_participants caps how many invitees may be accepted; pass none() for unlimited.
    ${createVisibility} fun create_${sceneKey}_with_invitations(
        invitees:          vector<address>,
        invites_expire_at: std::option::Option<u64>,
        scene_expires_at:  std::option::Option<u64>,
        max_participants:  std::option::Option<u64>,
        ctx:               &mut TxContext,
    ) {
        let scene = ${structName} {
            id:   sui::object::new(ctx),
            meta: dapp_system::new_scene_meta_with_invitations(
                invitees,
                invites_expire_at,
                scene_expires_at,
                max_participants,
            ),
            data: bag::new(ctx),
        };
        sui::transfer::share_object(scene);
    }

    /// Accept an invitation to this scene.
    ///
    /// The caller (ctx.sender()) must be in the invitees list and the invitation
    /// window must not have expired.  On success the caller is moved from the
    /// invitees list to the confirmed participants list (DF) and may participate
    /// in reactive writes.
    ///
    /// Because auth is handled by Sui's native transaction signing, this works
    /// for ALL wallet types: Ed25519, Secp256k1, Secp256r1 (Passkey), and zkLogin.
    public fun accept_${sceneKey}(
        storage: &mut ${structName},
        ctx:     &TxContext,
    ) {
        dapp_system::accept_scene_invitation<DappKey>(
            dapp_key::new(), &mut storage.id, &mut storage.meta, ctx
        );
    }

    /// Dynamically join an open scene.
    ///
    /// NOTE: This is intentionally public(package), consistent with leave_${sceneKey}.
    /// DApp system functions should add their own admission guard logic (e.g. check
    /// registration, payment, or whitelist) before calling this.
    public(package) fun join_${sceneKey}(
        storage: &mut ${structName},
        ctx:     &TxContext,
    ) {
        assert!(dapp_service::is_scene_active(&storage.meta, ctx.epoch_timestamp_ms()), ESceneExpired);
        dapp_service::add_scene_participant(&mut storage.id, &mut storage.meta, ctx.sender());
    }

    /// Leave this scene voluntarily — removes the caller from the participant list.
    ///
    /// NOTE: This is intentionally public(package) to prevent griefing (e.g. a
    /// player rage-quitting mid-match to block reactive writes). DApp system
    /// functions should add guard logic (e.g. only allow leaving during a lobby
    /// phase) before calling this.
    public(package) fun leave_${sceneKey}(
        storage: &mut ${structName},
        ctx:     &TxContext,
    ) {
        dapp_service::remove_scene_participant(&mut storage.id, &mut storage.meta, ctx.sender());
    }

    /// Expire and destroy a scene once its deadline has passed.
    /// The scene's Bag must be empty before this can succeed.
    ///
    /// IMPORTANT — Dynamic Field cleanup:
    /// Participant membership is stored as Dynamic Fields on the scene's UID.
    /// Calling this function while participants remain will orphan those DFs
    /// (their storage rebate cannot be recovered).
    ///
    /// Recommended usage:
    ///   - Small/competitive scenes (PvP, dungeon runs): ensure all participants
    ///     have called leave_${sceneKey} before expiring to reclaim storage rebate.
    ///   - Large open-world or long-lived scenes: skip expiry altogether.
    ///     Expired scenes are completely inert (reactive writes abort, join aborts)
    ///     and safe to leave on-chain indefinitely.
    public fun expire_${sceneKey}(
        storage: ${structName},
        ctx:     &TxContext,
    ) {
        assert!(!dapp_service::is_scene_active(&storage.meta, ctx.epoch_timestamp_ms()), ESceneNotExpiredYet);
        let ${structName} { id, meta: _, data } = storage;
        bag::destroy_empty(data);
        sui::object::delete(id);
    }
}
`;

    await formatAndWriteMove(code, path.join(outputDir, `${sceneKey}.move`), 'formatAndWriteMove');
  }
}
