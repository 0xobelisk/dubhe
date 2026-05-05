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

/**
 * Generate typed field accessors (get/set) for a SceneStorage's own fields.
 * Calls the framework's set_scene_field / get_scene_field.
 */
function sceneStorageType(markerName: string): string {
  return `dubhe::dapp_service::SceneStorage<${markerName}>`;
}

function generateFieldAccessors(sceneKey: string, cfg: SceneConfig): string {
  const markerName = toPascalCase(sceneKey);
  const storageType = sceneStorageType(markerName);
  const lines: string[] = [];

  for (const [fieldName, fieldType] of Object.entries(cfg.fields)) {
    const moveType = getMoveType(fieldType as string);

    lines.push(`
    public fun get_${fieldName}(storage: &${storageType}): ${moveType} {
        dubhe::dapp_system::get_scene_field<${markerName}, ${moveType}>(storage, b"${fieldName}")
    }

    public(package) fun set_${fieldName}(storage: &mut ${storageType}, value: ${moveType}) {
        dubhe::dapp_system::set_scene_field<DappKey, ${markerName}, ${moveType}>(
            dapp_key::new(), storage, b"${fieldName}", value
        );
    }`);
  }

  return lines.join('\n');
}

function generateFungibleBagAccessors(sceneKey: string, resourceName: string): string {
  const markerName = toPascalCase(sceneKey);
  const storageType = sceneStorageType(markerName);

  return `
    public fun get_${resourceName}(storage: &${storageType}): u64 {
        if (dubhe::dapp_system::has_scene_field<${markerName}, u64>(storage, b"${resourceName}")) {
            dubhe::dapp_system::get_scene_field<${markerName}, u64>(storage, b"${resourceName}")
        } else { 0 }
    }

    public(package) fun add_${resourceName}(storage: &mut ${storageType}, amount: u64) {
        let current = get_${resourceName}(storage);
        dubhe::dapp_system::set_scene_field<DappKey, ${markerName}, u64>(
            dapp_key::new(), storage, b"${resourceName}", current + amount
        );
    }

    public(package) fun sub_${resourceName}(storage: &mut ${storageType}, amount: u64) {
        let current = get_${resourceName}(storage);
        assert!(current >= amount, EInsufficientAmount);
        dubhe::dapp_system::set_scene_field<DappKey, ${markerName}, u64>(
            dapp_key::new(), storage, b"${resourceName}", current - amount
        );
    }`;
}

function generateUniqueBagAccessors(
  sceneKey: string,
  resourceName: string,
  idField: string
): string {
  const markerName = toPascalCase(sceneKey);
  const storageType = sceneStorageType(markerName);

  return `
    public fun has_${resourceName}(storage: &${storageType}, ${idField}: u64): bool {
        let key = sui::bcs::to_bytes(&${idField});
        dubhe::dapp_system::has_scene_field<${markerName}, vector<u8>>(storage, key)
    }

    public fun get_${resourceName}_data(storage: &${storageType}, ${idField}: u64): vector<u8> {
        let key = sui::bcs::to_bytes(&${idField});
        dubhe::dapp_system::get_scene_field<${markerName}, vector<u8>>(storage, key)
    }

    public(package) fun set_${resourceName}_data(storage: &mut ${storageType}, ${idField}: u64, data: vector<u8>) {
        let key = sui::bcs::to_bytes(&${idField});
        assert!(!dubhe::dapp_system::has_scene_field<${markerName}, vector<u8>>(storage, key), EDuplicateItemId);
        dubhe::dapp_system::set_scene_field<DappKey, ${markerName}, vector<u8>>(
            dapp_key::new(), storage, key, data
        );
    }

    public(package) fun remove_${resourceName}_data(storage: &mut ${storageType}, ${idField}: u64): vector<u8> {
        let key = sui::bcs::to_bytes(&${idField});
        assert!(dubhe::dapp_system::has_scene_field<${markerName}, vector<u8>>(storage, key), EFieldNotFound);
        dubhe::dapp_system::remove_scene_field<DappKey, ${markerName}, vector<u8>>(dapp_key::new(), storage, key)
    }`;
}

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
  const destStorageType = sceneStorageType(destMarker);
  const imports: string[] = [];
  const functions: string[] = [];

  for (const sourceName of acceptsFrom) {
    const sourceCfg = allObjects[sourceName] ?? allScenes[sourceName];
    if (!sourceCfg) continue;

    const sourceAccepts = sourceCfg.accepts ?? [];
    const sourceMarker = toPascalCase(sourceName);

    imports.push(`    use ${projectName}::${sourceName};`);

    const commonResources = sourceAccepts.filter((r) => destAccepts.includes(r));

    for (const resourceName of commonResources) {
      const resCfg = resources[resourceName];
      if (!resCfg || typeof resCfg === 'string') continue;
      const comp = resCfg as Component;

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

export async function generateScenes(config: DubheConfig, outputDir: string) {
  if (!config.scenes || Object.keys(config.scenes).length === 0) return;
  console.log('\n📦 Starting Scene Storage Generation...');

  const projectName = config.name;
  const resources = config.resources ?? {};

  for (const [sceneKey, sceneCfg] of Object.entries(config.scenes)) {
    console.log(`     └─ ${sceneKey}`);
    const markerName = toPascalCase(sceneKey);
    const sceneTypeTag = `b"${sceneKey}"`;

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

    const { imports: afImports, functions: afFunctions } = generateAcceptsFromTransfers(
      projectName,
      sceneKey,
      acceptedResources,
      sceneCfg.acceptsFrom ?? [],
      config
    );

    // Conditional String import
    const sceneFieldTypes = Object.values(sceneCfg.fields) as string[];
    const sceneNeedsStringImport = sceneFieldTypes.some(
      (t) => t === 'string' || t === 'String' || t === 'vector<String>'
    );
    const sceneStringImport = sceneNeedsStringImport ? `\n    use std::ascii::String;` : '';

    const hasUniqueBagAccessors = acceptedResources.some((resourceName) => {
      const resCfg = resources[resourceName];
      if (!resCfg || typeof resCfg === 'string') return false;
      return !!((resCfg as Component).unique && (resCfg as Component).keys?.length);
    });
    const hasFungibleBagAccessors = acceptedResources.some((resourceName) => {
      const resCfg = resources[resourceName];
      if (!resCfg || typeof resCfg === 'string') return false;
      return !!(resCfg as Component).fungible;
    });
    // EFieldNotFound is only used in remove_*_data for unique bag accessors
    const needsFieldNotFound = hasUniqueBagAccessors;

    const afImportBlock = afImports.length > 0 ? '\n' + afImports.join('\n') : '';

    const errorConstants = [
      needsFieldNotFound
        ? `    #[error]\n    const EFieldNotFound: vector<u8> = b"Field not found";`
        : '',
      hasFungibleBagAccessors
        ? `    #[error]\n    const EInsufficientAmount: vector<u8> = b"Insufficient amount";`
        : '',
      hasUniqueBagAccessors
        ? `    #[error]\n    const EDuplicateItemId: vector<u8> = b"Duplicate item id";`
        : '',
      `    #[error]\n    const ESceneExpired: vector<u8> = b"Scene has expired";`,
      `    #[error]\n    const ESceneNotExpiredYet: vector<u8> = b"Scene is still active and cannot be destroyed yet";`
    ]
      .filter(Boolean)
      .join('\n');

    // Use the full framework type name for all function signatures.
    const fullSceneType = `dubhe::dapp_service::SceneStorage<${markerName}>`;

    // Regenerate metaAccessors using full type
    const metaAccessorsFull = `
    public fun meta(storage: &${fullSceneType}): &dubhe::dapp_service::SceneMetadata {
        dubhe::dapp_service::scene_storage_meta(storage)
    }

    public fun is_active(storage: &${fullSceneType}, now_ms: u64): bool {
        dubhe::dapp_service::is_scene_active(dubhe::dapp_service::scene_storage_meta(storage), now_ms)
    }

    public fun is_participant(storage: &${fullSceneType}, addr: address): bool {
        dubhe::dapp_service::is_participant_in_scene_storage(storage, addr)
    }`;

    // All calls use fully-qualified dubhe::dapp_system::..., no alias import needed.
    // dapp_service::{Self, DappStorage} is used for is_scene_active / scene_storage_meta
    // and for the DappStorage type in create_* signatures.
    const code = `module ${projectName}::${sceneKey} {
    use dubhe::dapp_service::{Self, DappStorage};
    use ${projectName}::dapp_key;
    use ${projectName}::dapp_key::DappKey;${sceneStringImport}${afImportBlock}

    // ─── Error constants ───────────────────────────────────────────────────
${errorConstants}

    const SCENE_TYPE: vector<u8> = ${sceneTypeTag};

    // ─── Phantom marker type ───────────────────────────────────────────────
    /// Phantom type that distinguishes this scene from others at compile time.
    /// All functions use SceneStorage<${markerName}> directly in their signatures.
    public struct ${markerName} has copy, drop {}

    // ─── SceneMetadata helpers ─────────────────────────────────────────────
${metaAccessorsFull}

    // ─── Field accessors (own fields) ──────────────────────────────────────
${fieldAccessors}

    // ─── Bag accessors for accepted resources ─────────────────────────────
${bagAccessorParts.join('\n')}

    // ─── acceptsFrom: cross-storage transfer functions ─────────────────────
${afFunctions.join('\n')}

    // ─── Scene lifecycle entry functions ───────────────────────────────────

    /// Create an open scene.
    /// participants can be empty — use join_${sceneKey} to add dynamically.
    /// expires_at is optional: pass none() for a scene that never auto-expires.
    /// max_participants caps the participant list size; pass none() for unlimited.
    ${createVisibility} fun create_${sceneKey}(
        dapp_storage:     &DappStorage,
        participants:     vector<address>,
        expires_at:       std::option::Option<u64>,
        max_participants: std::option::Option<u64>,
        ctx:              &mut TxContext,
    ) {
        dubhe::dapp_system::create_and_share_typed_scene<DappKey, ${markerName}>(
            dapp_key::new(), dapp_storage, SCENE_TYPE, participants, expires_at, max_participants, ctx
        );
    }

    /// Create a scene with an invitation list — supports ALL Sui wallet types
    /// including zkLogin, multisig, Passkey, and Ed25519.
    ///
    /// Each invitee must call accept_${sceneKey} from their own wallet to confirm.
    ${createVisibility} fun create_${sceneKey}_with_invitations(
        dapp_storage:      &DappStorage,
        invitees:          vector<address>,
        invites_expire_at: std::option::Option<u64>,
        scene_expires_at:  std::option::Option<u64>,
        max_participants:  std::option::Option<u64>,
        ctx:               &mut TxContext,
    ) {
        dubhe::dapp_system::create_and_share_typed_scene_with_invitations<DappKey, ${markerName}>(
            dapp_key::new(), dapp_storage, SCENE_TYPE, invitees, invites_expire_at, scene_expires_at, max_participants, ctx
        );
    }

    /// Accept an invitation to this scene.
    ///
    /// The caller (ctx.sender()) must be in the invitees list and the invitation
    /// window must not have expired.
    public fun accept_${sceneKey}(
        storage: &mut ${fullSceneType},
        ctx:     &TxContext,
    ) {
        dubhe::dapp_system::accept_typed_scene_invitation<DappKey, ${markerName}>(
            dapp_key::new(), storage, ctx
        );
    }

    /// Dynamically join an open scene.
    ///
    /// NOTE: public(package) — DApp system functions should add admission guards
    /// (registration check, payment, whitelist) before calling this.
    public(package) fun join_${sceneKey}(
        storage: &mut ${fullSceneType},
        ctx:     &TxContext,
    ) {
        assert!(
            dapp_service::is_scene_active(dapp_service::scene_storage_meta(storage), ctx.epoch_timestamp_ms()),
            ESceneExpired
        );
        dubhe::dapp_system::join_typed_scene<${markerName}>(storage, ctx);
    }

    /// Leave this scene voluntarily.
    ///
    /// NOTE: public(package) to prevent griefing. DApp system functions should
    /// add guard logic before calling this.
    public(package) fun leave_${sceneKey}(
        storage: &mut ${fullSceneType},
        ctx:     &TxContext,
    ) {
        dubhe::dapp_system::leave_typed_scene<${markerName}>(storage, ctx);
    }

    /// Expire and destroy a scene once its deadline has passed.
    /// The scene's Bag AND participant list must both be empty before this succeeds.
    ///
    /// Participant membership is stored as Dynamic Fields on the scene's UID.
    /// destroy_typed_scene will abort with EParticipantsStillPresent if any
    /// participant DFs remain, so all participants must call leave_${sceneKey}
    /// first to reclaim their storage rebate.
    ///
    /// Alternative: skip expiry altogether for large or long-lived scenes.
    /// An expired scene is completely inert (reactive writes abort, join aborts)
    /// and safe to leave on-chain indefinitely without manual cleanup.
    public fun expire_${sceneKey}(
        storage: ${fullSceneType},
        ctx:     &TxContext,
    ) {
        assert!(
            !dapp_service::is_scene_active(dapp_service::scene_storage_meta(&storage), ctx.epoch_timestamp_ms()),
            ESceneNotExpiredYet
        );
        dubhe::dapp_system::destroy_typed_scene<DappKey, ${markerName}>(dapp_key::new(), storage);
    }
}
`;

    await formatAndWriteMove(code, path.join(outputDir, `${sceneKey}.move`), 'formatAndWriteMove');
  }
}
