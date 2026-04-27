import { DubheConfig, Component } from '../types';

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
  const scenes = config.scenes ?? {};

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

    if (comp.reactive && comp.fungible) {
      console.warn(
        `[dubhe codegen] WARNING: resources.${name} has both reactive: true and fungible: true. ` +
          `Fungible quantity changes (add/sub) do not suit reactive cross-user writes. ` +
          `Consider using a transfer function instead.`
      );
    }

    if (comp.fungible && comp.listable) {
      console.warn(
        `[dubhe codegen] WARNING: resources.${name} has both fungible: true and listable: true. ` +
          `The generated list_${name} entry function will include an amount parameter for partial listings.`
      );
    }

    if (comp.unique && !comp.keys?.length) {
      throw new Error(
        `resources.${name} has unique: true but is missing keys: ['<id_field>']. ` +
          `Specify the ID field name so codegen can generate mint and existence checks.`
      );
    }

    if (comp.transferable && !acceptedResources.has(name)) {
      console.warn(
        `[dubhe codegen] WARNING: resources.${name} has transferable: true but is not referenced ` +
          `in any objects.accepts or scenes.accepts. The cross-layer transfer functions will not be generated.`
      );
    }
  }
}
