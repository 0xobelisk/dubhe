/**
 * read-permit.ts — Read the WorldPermit object ID from the deployed DappStorage.
 *
 * Usage:
 *   cd templates/nextjs/sui-farm/packages/contracts
 *   npx tsx scripts/read-permit.ts
 *
 * Outputs the WorldPermitId to add to deployment.ts.
 */
import { SuiClient, getFullnodeUrl } from '@0xobelisk/sui-client';
import { Network, DappStorageId, PackageId } from './config.ts';

async function main() {
  const network = (process.argv[2] ?? Network) as any;

  if (!DappStorageId || DappStorageId === '0x0') {
    console.error('DappStorageId not set in deployment.ts. Deploy first.');
    process.exit(1);
  }

  const client = new SuiClient({ url: getFullnodeUrl(network) });

  let cursor: string | null | undefined = null;
  let worldPermitId: string | null = null;

  outer: while (true) {
    const result = await client.getDynamicFields({
      parentId: DappStorageId,
      ...(cursor ? { cursor } : {})
    });

    for (const field of result.data) {
      const nameStr = JSON.stringify(field.name as any);
      if (nameStr.includes('world_permit_id')) {
        const fieldObj = await client.getDynamicFieldObject({
          parentId: DappStorageId,
          name: field.name
        });
        const fields = (fieldObj.data?.content as any)?.fields ?? {};
        const valueFields = fields.value?.fields ?? fields;
        const objectId = valueFields.object_id ?? valueFields.value ?? null;
        if (objectId) {
          worldPermitId = typeof objectId === 'string' ? objectId : JSON.stringify(objectId);
          break outer;
        }
      }
    }

    if (!result.hasNextPage) break;
    cursor = result.nextCursor;
  }

  if (!worldPermitId) {
    console.log('Could not find world_permit_id in DappStorage dynamic fields.');
    console.log('Trying to find ScenePermit objects...');
    const objs = await client.queryEvents({
      query: { MoveEventType: `${PackageId.split('::')[0]}::dapp_system::ScenePermitCreated` }
    });
    console.log('Events:', JSON.stringify(objs.data, null, 2));
    process.exit(1);
  }

  console.log('\n=== WorldPermitId found ===');
  console.log(worldPermitId);
  console.log('\nAdd to deployment.ts:');
  console.log(`export const WorldPermitId = '${worldPermitId}';`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
