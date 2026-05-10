'use client';

import { useState, useEffect } from 'react';
import { useDubhe } from '@0xobelisk/react/sui';
import { DappStorageId } from 'contracts/deployment';

/**
 * Reads the WorldPermit object ID directly from DappStorage dynamic fields.
 *
 * The world_permit_id global resource is stored by deploy_hook as:
 *   key  = [b"world_permit_id", b"object_id"]  (vector<vector<u8>>)
 *   value = 32-byte BCS-encoded address
 *
 * This hook queries it once on mount and caches it for the session.
 * It automatically stays correct across redeployments without any manual update.
 */

let _cached: string | null = null; // module-level cache — one fetch per browser session

export function useWorldPermitId() {
  const { contract, dappStorageId } = useDubhe();
  const [permitId, setPermitId] = useState<string | null>(_cached);
  const [loading, setLoading] = useState(_cached === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (_cached) {
      setPermitId(_cached);
      setLoading(false);
      return;
    }

    const storageId = dappStorageId ?? DappStorageId;
    if (!contract || !storageId || storageId === '0x0') return;

    setLoading(true);
    setError(null);

    const KEY_WORLD = Array.from(Buffer.from('world_permit_id'));
    const KEY_OBJECT_ID = Array.from(Buffer.from('object_id'));

    const dfName = {
      type: 'vector<vector<u8>>',
      value: [KEY_WORLD, KEY_OBJECT_ID]
    };

    (contract as any).suiInteractor.currentClient
      .getDynamicFieldObject({ parentId: storageId, name: dfName })
      .then((res: any) => {
        const bytes: number[] = res?.data?.content?.fields?.value;
        if (!Array.isArray(bytes) || bytes.length !== 32) {
          throw new Error('world_permit_id field not found or malformed');
        }
        const hex = '0x' + bytes.map((b: number) => b.toString(16).padStart(2, '0')).join('');
        _cached = hex;
        setPermitId(hex);
      })
      .catch((err: any) => {
        console.error('useWorldPermitId error:', err);
        setError(err?.message ?? String(err));
      })
      .finally(() => setLoading(false));
  }, [contract, dappStorageId]);

  return { permitId, loading, error };
}
