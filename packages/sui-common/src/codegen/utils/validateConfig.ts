import chalk from 'chalk';
import { DubheConfig, Component } from '../types';

const warn = (msg: string) =>
  console.warn(chalk.yellow('[dubhe codegen]') + chalk.yellow(' WARNING: ') + msg);

/**
 * Validate a DubheConfig for semantic errors and warn on suspicious combinations.
 * Called by codegen before generation begins.
 *
 * Hard errors (throw):
 *   - A resource listed in objects.accepts / scenes.accepts lacks `transferable: true`
 *
 * Warnings (console.warn):
 *   - reactive: true + fungible: true  (fungible deltas don't fit reactive pattern)
 *   - fungible: true + listable: true  (valid but requires special list with amount param)
 */
export function validateConfig(config: DubheConfig): void {
  const resources = config.resources ?? {};
  const objects = config.objects ?? {};
  const permits = config.permits ?? {};
  const scenes = config.scenes ?? {};

  // ── Cross-namespace naming conflict check ─────────────────────────────────
  // resources, objects, permits, and scenes all generate Move modules named
  // `module <project>::<key>`.  Duplicate keys across these three maps would
  // produce two modules with the same name in the same package, causing a
  // compile-time error.
  const resourceKeys = new Set(Object.keys(resources));
  const objectKeys = new Set(Object.keys(objects));
  const permitKeys = new Set(Object.keys(permits));
  const sceneKeys = new Set(Object.keys(scenes));

  const duplicates = new Set<string>();
  for (const k of resourceKeys) {
    if (objectKeys.has(k) || permitKeys.has(k) || sceneKeys.has(k)) duplicates.add(k);
  }
  for (const k of objectKeys) {
    if (permitKeys.has(k) || sceneKeys.has(k)) duplicates.add(k);
  }
  for (const k of permitKeys) {
    if (sceneKeys.has(k)) duplicates.add(k);
  }
  if (duplicates.size > 0) {
    throw new Error(
      `Duplicate module names found across resources/objects/permits/scenes: ${[...duplicates]
        .sort()
        .join(', ')}`
    );
  }

  // ── Collect all resource names that are accepted by objects or scenes ────────
  const acceptedResources = new Set<string>();

  for (const [objKey, objCfg] of Object.entries(objects)) {
    for (const r of objCfg.accepts ?? []) {
      acceptedResources.add(r);
      const res = resources[r];
      if (!res) {
        throw new Error(
          `objects.${objKey}.accepts references '${r}' which is not defined in resources`
        );
      }
      if (typeof res !== 'string' && !(res as Component).transferable) {
        throw new Error(
          `objects.${objKey}.accepts includes '${r}', but resources.${r} is missing transferable: true. ` +
            `Add transferable: true to resources.${r} to enable cross-storage transfers.`
        );
      }
    }

    for (const r of objCfg.acceptsFrom ?? []) {
      const isObject = !!objects[r];
      const isScene = !!scenes[r];
      if (!isObject && !isScene) {
        throw new Error(
          `objects.${objKey}.acceptsFrom references '${r}' which is not defined in objects or scenes`
        );
      }
    }
  }

  for (const [sceneKey, sceneCfg] of Object.entries(scenes)) {
    if (!sceneCfg.authorization) {
      throw new Error(
        `scenes.${sceneKey} is missing authorization. Use { kind: 'system' } or ` +
          `{ kind: 'permit', permit: '<permit_name>' }.`
      );
    }
    if (sceneCfg.authorization.kind === 'permit') {
      if (!permits[sceneCfg.authorization.permit]) {
        throw new Error(
          `scenes.${sceneKey}.authorization references permit '${sceneCfg.authorization.permit}', ` +
            `but permits.${sceneCfg.authorization.permit} is not defined`
        );
      }
    } else if (sceneCfg.authorization.kind !== 'system') {
      throw new Error(`scenes.${sceneKey}.authorization.kind must be 'system' or 'permit'`);
    }

    for (const r of sceneCfg.accepts ?? []) {
      acceptedResources.add(r);
      const res = resources[r];
      if (!res) {
        throw new Error(
          `scenes.${sceneKey}.accepts references '${r}' which is not defined in resources`
        );
      }
      if (typeof res !== 'string' && !(res as Component).transferable) {
        throw new Error(
          `scenes.${sceneKey}.accepts includes '${r}', but resources.${r} is missing transferable: true. ` +
            `Add transferable: true to resources.${r} to enable cross-storage transfers.`
        );
      }
    }

    for (const r of sceneCfg.acceptsFrom ?? []) {
      const isObject = !!objects[r];
      const isScene = !!scenes[r];
      if (!isObject && !isScene) {
        throw new Error(
          `scenes.${sceneKey}.acceptsFrom references '${r}' which is not defined in objects or scenes`
        );
      }
    }
  }

  // ── Per-resource annotation combination checks ───────────────────────────────
  for (const [name, resource] of Object.entries(resources)) {
    if (typeof resource === 'string') continue;
    const comp = resource as Component;

    // ── offchain incompatibility checks ─────────────────────────────────────
    if (comp.offchain) {
      if (comp.listable) {
        throw new Error(
          `resources.${name} has both offchain: true and listable: true. ` +
            `offchain resources emit events but store no on-chain state, ` +
            `so there is nothing to take out and place into a Listing.`
        );
      }
      if (comp.transferable) {
        throw new Error(
          `resources.${name} has both offchain: true and transferable: true. ` +
            `offchain resources have no on-chain state to transfer between storages.`
        );
      }
      if (comp.reactive) {
        throw new Error(
          `resources.${name} has both offchain: true and reactive: true. ` +
            `reactive writes target on-chain state, which offchain resources do not have.`
        );
      }
      if (comp.fungible) {
        warn(
          `resources.${chalk.bold(name)} has both ${chalk.cyan('offchain: true')} and ${chalk.cyan(
            'fungible: true'
          )}. ` +
            `offchain fungible events are emitted only; no on-chain balance is maintained ` +
            `and no add/sub functions are generated. This is unusual — verify your intent.`
        );
      }
    }

    if (comp.reactive && comp.fungible) {
      warn(
        `resources.${chalk.bold(name)} has both ${chalk.cyan('reactive: true')} and ${chalk.cyan(
          'fungible: true'
        )}. ` +
          `Fungible quantity changes (add/sub) do not suit reactive cross-user writes. ` +
          `Consider using a transfer function instead.`
      );
    }

    // ── global incompatibility checks ────────────────────────────────────────
    if (comp.global) {
      if (comp.reactive) {
        throw new Error(
          `resources.${name} has both global: true and reactive: true. ` +
            `global resources live in DappStorage (shared), not in UserStorage. ` +
            `Reactive writes operate between two UserStorage objects and are incompatible with global resources.`
        );
      }
      if (comp.listable) {
        throw new Error(
          `resources.${name} has both global: true and listable: true. ` +
            `global resources live in DappStorage and cannot be individually listed for sale. ` +
            `listable requires per-user ownership in UserStorage.`
        );
      }
      if (comp.transferable) {
        throw new Error(
          `resources.${name} has both global: true and transferable: true. ` +
            `global resources live in DappStorage and are not owned by individual users. ` +
            `transferable requires per-user state in UserStorage or ObjectStorage.`
        );
      }
    }

    if (comp.fungible && comp.listable) {
      warn(
        `resources.${chalk.bold(name)} has both ${chalk.cyan('fungible: true')} and ${chalk.cyan(
          'listable: true'
        )}. ` +
          `The generated ${chalk.green(`list_${name}`)} entry function will include an ${chalk.cyan(
            'amount'
          )} parameter for partial listings.`
      );
    }

    if (comp.transferable && !acceptedResources.has(name)) {
      warn(
        `resources.${chalk.bold(name)} has ${chalk.cyan(
          'transferable: true'
        )} but is not referenced ` +
          `in any ${chalk.cyan('objects.accepts')} or ${chalk.cyan(
            'scenes.accepts'
          )}. The cross-layer transfer functions will not be generated.`
      );
    }
  }
}
