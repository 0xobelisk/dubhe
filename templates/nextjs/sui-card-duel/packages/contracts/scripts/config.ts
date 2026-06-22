/**
 * Single source of truth for scripts — reads values from deployment.ts.
 * Handles tsx CJS/ESM interop: when tsx compiles a .ts file as CJS,
 * ESM namespace imports put all exports under `default`.
 */
import * as _mod from '../deployment.ts';

// Under tsx CJS interop, named exports are on `default`; fall back to namespace itself for ESM.
const dep: Record<string, any> = ((_mod as any).default ?? _mod) as Record<string, any>;

export const Network: string = dep['Network'];
export const PackageId: string = dep['PackageId'];
export const OriginalPackageId: string = dep['OriginalPackageId'];
export const DappKey: string = dep['DappKey'];
export const DappHubId: string = dep['DappHubId'];
export const DappStorageId: string = dep['DappStorageId'];
export const FrameworkPackageId: string | undefined = dep['FrameworkPackageId'];
