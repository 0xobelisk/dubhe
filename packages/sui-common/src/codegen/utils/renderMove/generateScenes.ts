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

function sceneStorageType(markerName: string): string {
  return `dubhe::dapp_service::SceneStorage<${markerName}>`;
}

function permitMarker(config: DubheConfig, cfg: SceneConfig): string | undefined {
  if (cfg.authorization.kind !== 'permit') return undefined;
  return `${config.name}::${cfg.authorization.permit}::${toPascalCase(cfg.authorization.permit)}`;
}

function permitType(config: DubheConfig, cfg: SceneConfig): string | undefined {
  if (cfg.authorization.kind !== 'permit') return undefined;
  return `dubhe::dapp_service::ScenePermit<${permitMarker(config, cfg)}>`;
}

function generateFieldAccessors(config: DubheConfig, sceneKey: string, cfg: SceneConfig): string {
  const markerName = toPascalCase(sceneKey);
  const storageType = sceneStorageType(markerName);
  const permit = permitMarker(config, cfg);
  const permitStorageType = permitType(config, cfg);
  const lines: string[] = [];

  for (const [fieldName, fieldType] of Object.entries(cfg.fields)) {
    const moveType = getMoveType(fieldType as string);

    if (cfg.authorization.kind === 'permit' && permit && permitStorageType) {
      lines.push(`
    public fun get_${fieldName}(storage: &${storageType}): ${moveType} {
        dubhe::dapp_system::get_scene_field<${markerName}, ${moveType}>(storage, b"${fieldName}")
    }

    public(package) fun set_${fieldName}(
        permit:       &${permitStorageType},
        storage:      &mut ${storageType},
        user_storage: &dubhe::dapp_service::UserStorage,
        value:        ${moveType},
        ctx:          &TxContext,
    ) {
        dubhe::dapp_system::set_scene_field<DappKey, ${permit}, ${markerName}, ${moveType}>(
            dapp_key::new(), permit, storage, user_storage, b"${fieldName}", value, ctx
        );
    }

    public(package) fun remove_${fieldName}_system_maintenance(storage: &mut ${storageType}): ${moveType} {
        dubhe::dapp_system::remove_scene_field_system_maintenance<DappKey, ${markerName}, ${moveType}>(
            dapp_key::new(), storage, b"${fieldName}"
        )
    }`);
    } else {
      lines.push(`
    public fun get_${fieldName}(storage: &${storageType}): ${moveType} {
        dubhe::dapp_system::get_scene_field<${markerName}, ${moveType}>(storage, b"${fieldName}")
    }

    public(package) fun set_${fieldName}(storage: &mut ${storageType}, value: ${moveType}) {
        dubhe::dapp_system::set_scene_field_system<DappKey, ${markerName}, ${moveType}>(
            dapp_key::new(), storage, b"${fieldName}", value
        );
    }

    public(package) fun remove_${fieldName}(storage: &mut ${storageType}): ${moveType} {
        dubhe::dapp_system::remove_scene_field_system_maintenance<DappKey, ${markerName}, ${moveType}>(
            dapp_key::new(), storage, b"${fieldName}"
        )
    }`);
    }
  }

  return lines.join('\n');
}

function writeArgs(config: DubheConfig, cfg: SceneConfig): string {
  const type = permitType(config, cfg);
  if (cfg.authorization.kind !== 'permit' || !type) return '';
  return `        permit:  &${type},\n`;
}

/// Permit-authorized writes identify the caller by user_storage's canonical owner.
function userStorageArg(cfg: SceneConfig): string {
  if (cfg.authorization.kind !== 'permit') return '';
  return `        user_storage: &dubhe::dapp_service::UserStorage,\n`;
}

function writeCtxArg(cfg: SceneConfig): string {
  return cfg.authorization.kind === 'permit' ? '        ctx:     &TxContext,\n' : '';
}

function setFieldCall(
  config: DubheConfig,
  cfg: SceneConfig,
  markerName: string,
  moveType: string,
  fieldExpr: string,
  valueExpr: string
): string {
  const permit = permitMarker(config, cfg);
  if (cfg.authorization.kind === 'permit' && permit) {
    return `dubhe::dapp_system::set_scene_field<DappKey, ${permit}, ${markerName}, ${moveType}>(
            dapp_key::new(), permit, storage, user_storage, ${fieldExpr}, ${valueExpr}, ctx
        );`;
  }
  return `dubhe::dapp_system::set_scene_field_system<DappKey, ${markerName}, ${moveType}>(
            dapp_key::new(), storage, ${fieldExpr}, ${valueExpr}
        );`;
}

function removeFieldCall(
  config: DubheConfig,
  cfg: SceneConfig,
  markerName: string,
  moveType: string,
  fieldExpr: string
): string {
  const permit = permitMarker(config, cfg);
  if (cfg.authorization.kind === 'permit' && permit) {
    return `dubhe::dapp_system::remove_scene_field<DappKey, ${permit}, ${markerName}, ${moveType}>(
            dapp_key::new(), permit, storage, user_storage, ${fieldExpr}, ctx
        )`;
  }
  return `dubhe::dapp_system::remove_scene_field_system_maintenance<DappKey, ${markerName}, ${moveType}>(
            dapp_key::new(), storage, ${fieldExpr}
        )`;
}

function generateFungibleBagAccessors(
  config: DubheConfig,
  sceneKey: string,
  cfg: SceneConfig,
  resourceName: string
): string {
  const markerName = toPascalCase(sceneKey);
  const storageType = sceneStorageType(markerName);

  return `
    public fun get_${resourceName}(storage: &${storageType}): u64 {
        if (dubhe::dapp_system::has_scene_field<${markerName}, u64>(storage, b"${resourceName}")) {
            dubhe::dapp_system::get_scene_field<${markerName}, u64>(storage, b"${resourceName}")
        } else { 0 }
    }

    public(package) fun add_${resourceName}(
${writeArgs(config, cfg)}        storage: &mut ${storageType},
${userStorageArg(cfg)}        amount:  u64,
${writeCtxArg(cfg)}    ) {
        let current = get_${resourceName}(storage);
        ${setFieldCall(config, cfg, markerName, 'u64', `b"${resourceName}"`, 'current + amount')}
    }

    public(package) fun sub_${resourceName}(
${writeArgs(config, cfg)}        storage: &mut ${storageType},
${userStorageArg(cfg)}        amount:  u64,
${writeCtxArg(cfg)}    ) {
        let current = get_${resourceName}(storage);
        assert!(current >= amount, EInsufficientAmount);
        ${setFieldCall(config, cfg, markerName, 'u64', `b"${resourceName}"`, 'current - amount')}
    }`;
}

function generateKeyedBagAccessors(
  config: DubheConfig,
  sceneKey: string,
  cfg: SceneConfig,
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

    public(package) fun set_${resourceName}_data(
${writeArgs(config, cfg)}        storage: &mut ${storageType},
${userStorageArg(cfg)}        ${idField}: u64,
        data:    vector<u8>,
${writeCtxArg(cfg)}    ) {
        let key = sui::bcs::to_bytes(&${idField});
        assert!(!dubhe::dapp_system::has_scene_field<${markerName}, vector<u8>>(storage, key), EDuplicateItemId);
        ${setFieldCall(config, cfg, markerName, 'vector<u8>', 'key', 'data')}
    }

    public(package) fun remove_${resourceName}_data(
${writeArgs(config, cfg)}        storage: &mut ${storageType},
${userStorageArg(cfg)}        ${idField}: u64,
${writeCtxArg(cfg)}    ): vector<u8> {
        let key = sui::bcs::to_bytes(&${idField});
        assert!(dubhe::dapp_system::has_scene_field<${markerName}, vector<u8>>(storage, key), EFieldNotFound);
        ${removeFieldCall(config, cfg, markerName, 'vector<u8>', 'key')}
    }`;
}

function generateAcceptsFromTransfers(
  projectName: string,
  destKey: string,
  destCfg: SceneConfig,
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
  const destPermit = permitType(config, destCfg);
  const destPermitArg =
    destCfg.authorization.kind === 'permit' && destPermit
      ? `        dest_permit: &${destPermit},\n`
      : '';
  const destCallPrefix = destCfg.authorization.kind === 'permit' ? 'dest_permit, ' : '';
  const destCtxCall = destCfg.authorization.kind === 'permit' ? ', ctx' : '';

  for (const sourceName of acceptsFrom) {
    const sourceCfg = allObjects[sourceName] ?? allScenes[sourceName];
    if (!sourceCfg) continue;

    const sourceAccepts = sourceCfg.accepts ?? [];
    const sourceMarker = toPascalCase(sourceName);
    imports.push(`    use ${projectName}::${sourceName};`);

    const isSourceScene = !!allScenes[sourceName];
    const qualifiedSourceMarker = `${projectName}::${sourceName}::${sourceMarker}`;
    const sourceStorageType = isSourceScene
      ? `dubhe::dapp_service::SceneStorage<${qualifiedSourceMarker}>`
      : `dubhe::dapp_service::ObjectStorage<${qualifiedSourceMarker}>`;
    const sceneSourceCfg = isSourceScene ? (sourceCfg as SceneConfig) : undefined;
    const sourcePermit = sceneSourceCfg ? permitType(config, sceneSourceCfg) : undefined;
    const sourceIsPermitScene = sceneSourceCfg?.authorization.kind === 'permit' && !!sourcePermit;
    const sourcePermitArg = sourceIsPermitScene ? `        source_permit: &${sourcePermit},\n` : '';
    const sourceCallPrefix = sourceIsPermitScene ? 'source_permit, ' : '';
    const sourceUserStorageCall = sourceIsPermitScene ? 'user_storage, ' : '';
    const sourceCtxCall = sourceIsPermitScene ? ', ctx' : '';

    const destIsPermitScene = destCfg.authorization.kind === 'permit';
    const destUserStorageCall = destIsPermitScene ? 'user_storage, ' : '';
    // Permit-authorized writes resolve the caller identity from user_storage.
    const userStorageParam =
      sourceIsPermitScene || destIsPermitScene
        ? `        user_storage: &dubhe::dapp_service::UserStorage,\n`
        : '';
    const ctxParam =
      sourceIsPermitScene || destIsPermitScene ? '        ctx:         &TxContext,\n' : '';

    const commonResources = sourceAccepts.filter((r) => destAccepts.includes(r));
    for (const resourceName of commonResources) {
      const resCfg = resources[resourceName];
      if (!resCfg || typeof resCfg === 'string') continue;
      const comp = resCfg as Component;

      if (!comp.fungible && comp.keys?.length) {
        const idField = comp.keys[0];
        functions.push(`
    public(package) fun transfer_${sourceName}_to_${destKey}_${resourceName}(
${sourcePermitArg}${destPermitArg}        from:        &mut ${sourceStorageType},
        to:          &mut ${destStorageType},
${userStorageParam}        ${idField}: u64,
${ctxParam}    ) {
        let data = ${sourceName}::remove_${resourceName}_data(${sourceCallPrefix}from, ${sourceUserStorageCall}${idField}${sourceCtxCall});
        set_${resourceName}_data(${destCallPrefix}to, ${destUserStorageCall}${idField}, data${destCtxCall});
    }`);
      } else {
        functions.push(`
    public(package) fun transfer_${sourceName}_to_${destKey}_${resourceName}(
${sourcePermitArg}${destPermitArg}        from:   &mut ${sourceStorageType},
        to:     &mut ${destStorageType},
${userStorageParam}        amount: u64,
${ctxParam}    ) {
        ${sourceName}::sub_${resourceName}(${sourceCallPrefix}from, ${sourceUserStorageCall}amount${sourceCtxCall});
        add_${resourceName}(${destCallPrefix}to, ${destUserStorageCall}amount${destCtxCall});
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
    const fullSceneType = sceneStorageType(markerName);
    const fieldAccessors = generateFieldAccessors(config, sceneKey, sceneCfg);
    const acceptedResources = sceneCfg.accepts ?? [];

    const bagAccessorParts: string[] = [];
    for (const resourceName of acceptedResources) {
      const resCfg = resources[resourceName];
      if (!resCfg || typeof resCfg === 'string') continue;
      const comp = resCfg as Component;
      if (!comp.fungible && comp.keys?.length) {
        bagAccessorParts.push(
          generateKeyedBagAccessors(config, sceneKey, sceneCfg, resourceName, comp.keys[0])
        );
      } else {
        bagAccessorParts.push(
          generateFungibleBagAccessors(config, sceneKey, sceneCfg, resourceName)
        );
      }
    }

    const { imports: afImports, functions: afFunctions } = generateAcceptsFromTransfers(
      projectName,
      sceneKey,
      sceneCfg,
      acceptedResources,
      sceneCfg.acceptsFrom ?? [],
      config
    );

    const sceneFieldTypes = Object.values(sceneCfg.fields) as string[];
    const sceneNeedsStringImport = sceneFieldTypes.some(
      (t) => t === 'string' || t === 'String' || t === 'vector<String>'
    );
    const sceneStringImport = sceneNeedsStringImport ? `\n    use std::ascii::String;` : '';

    const hasKeyedBagAccessors = acceptedResources.some((resourceName) => {
      const resCfg = resources[resourceName];
      if (!resCfg || typeof resCfg === 'string') return false;
      return !!(resCfg as Component).keys?.length && !(resCfg as Component).fungible;
    });
    const hasFungibleBagAccessors = acceptedResources.some((resourceName) => {
      const resCfg = resources[resourceName];
      if (!resCfg || typeof resCfg === 'string') return false;
      return !!(resCfg as Component).fungible;
    });

    const errorConstants = [
      hasKeyedBagAccessors
        ? `    #[error]\n    const EFieldNotFound: vector<u8> = b"Field not found";`
        : '',
      hasFungibleBagAccessors
        ? `    #[error]\n    const EInsufficientAmount: vector<u8> = b"Insufficient amount";`
        : '',
      hasKeyedBagAccessors
        ? `    #[error]\n    const EDuplicateItemId: vector<u8> = b"Duplicate item id";`
        : ''
    ]
      .filter(Boolean)
      .join('\n');
    const errorBlock =
      errorConstants.length > 0
        ? `\n    // ─── Error constants ───────────────────────────────────────────────────\n${errorConstants}\n`
        : '';

    const afImportBlock = afImports.length > 0 ? '\n' + afImports.join('\n') : '';
    const permit = permitType(config, sceneCfg);
    const createFns =
      sceneCfg.authorization.kind === 'permit' && permit
        ? `
    public(package) fun new_${sceneKey}_with_permit(
        dapp_storage: &DappStorage,
        permit:       &${permit},
        ctx:          &mut TxContext,
    ): ${fullSceneType} {
        dubhe::dapp_system::new_typed_scene_with_permit<DappKey, ${permitMarker(
          config,
          sceneCfg
        )}, ${markerName}>(
            dapp_key::new(), dapp_storage, permit, SCENE_TYPE, ctx
        )
    }

    public(package) fun create_${sceneKey}_with_permit(
        dapp_storage: &DappStorage,
        permit:       &${permit},
        ctx:          &mut TxContext,
    ) {
        dubhe::dapp_system::create_and_share_typed_scene_with_permit<DappKey, ${permitMarker(
          config,
          sceneCfg
        )}, ${markerName}>(
            dapp_key::new(), dapp_storage, permit, SCENE_TYPE, ctx
        );
    }`
        : `
    public(package) fun new_${sceneKey}_system(
        dapp_storage: &DappStorage,
        ctx:          &mut TxContext,
    ): ${fullSceneType} {
        dubhe::dapp_system::new_typed_scene_system<DappKey, ${markerName}>(
            dapp_key::new(), dapp_storage, SCENE_TYPE, ctx
        )
    }

    public(package) fun create_${sceneKey}_system(
        dapp_storage: &DappStorage,
        ctx:          &mut TxContext,
    ) {
        dubhe::dapp_system::create_and_share_typed_scene_system<DappKey, ${markerName}>(
            dapp_key::new(), dapp_storage, SCENE_TYPE, ctx
        );
    }`;

    const code = `module ${projectName}::${sceneKey} {
    use dubhe::dapp_service::DappStorage;
    use ${projectName}::dapp_key;
    use ${projectName}::dapp_key::DappKey;${sceneStringImport}${afImportBlock}
${errorBlock}
    const SCENE_TYPE: vector<u8> = ${sceneTypeTag};

    /// Phantom type that distinguishes this scene storage at compile time.
    public struct ${markerName} has copy, drop {}

    // ─── Field accessors (own fields) ──────────────────────────────────────
${fieldAccessors}

    // ─── Bag accessors for accepted resources ─────────────────────────────
${bagAccessorParts.join('\n')}

    // ─── acceptsFrom: cross-storage transfer functions ─────────────────────
${afFunctions.join('\n')}

    // ─── SceneStorage lifecycle wrappers ──────────────────────────────────
${createFns}

    public(package) fun share_${sceneKey}(storage: ${fullSceneType}) {
        dubhe::dapp_system::share_scene_storage<DappKey, ${markerName}>(
            dapp_key::new(), storage
        );
    }

    public(package) fun destroy_${sceneKey}(storage: ${fullSceneType}) {
        dubhe::dapp_system::destroy_typed_scene<DappKey, ${markerName}>(
            dapp_key::new(), storage
        );
    }
}
`;

    await formatAndWriteMove(code, path.join(outputDir, `${sceneKey}.move`), 'formatAndWriteMove');
  }
}
