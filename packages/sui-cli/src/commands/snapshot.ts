import type { CommandModule } from 'yargs';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { SuiClient, getFullnodeUrl, type SuiObjectResponse } from '@mysten/sui/client';
import { getDefaultNetwork, logError } from '../utils';
import { handlerExit } from './shell';
import {
  ObjectSnapshot,
  SnapshotEntry,
  diffSnapshotEntries,
  formatSnapshotDiffSummary
} from './snapshotUtils';

const MULTI_GET_OBJECTS_BATCH_SIZE = 50;

type Options = {
  network: any;
  'rpc-url'?: string;
  objects?: string;
  'objects-file'?: string;
  from?: string;
  to?: string;
  out?: string;
  json?: boolean;
  debug?: boolean;
};

function parseInlineObjectIds(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseObjectIdsFile(filePath: string): string[] {
  return fs
    .readFileSync(filePath, 'utf-8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function dedupeObjectIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeOwner(owner: unknown): string | undefined {
  if (owner == null) return undefined;
  if (typeof owner === 'string') return owner;
  return toText(owner);
}

function normalizeSnapshotEntry(objectId: string, response: SuiObjectResponse): SnapshotEntry {
  if (response.error) {
    return {
      objectId,
      version: '-',
      digest: '-',
      status: 'error',
      error: toText(response.error)
    };
  }

  const data = response.data;
  if (!data) {
    return {
      objectId,
      version: '-',
      digest: '-',
      status: 'error',
      error: 'Object data missing in RPC response'
    };
  }

  return {
    objectId: data.objectId ?? objectId,
    version: `${data.version}`,
    digest: data.digest ?? '-',
    type: data.type ?? undefined,
    owner: normalizeOwner(data.owner),
    previousTransaction: data.previousTransaction ?? undefined,
    storageRebate: data.storageRebate != null ? `${data.storageRebate}` : undefined,
    status: 'found'
  };
}

function readSnapshotFile(filePath: string): ObjectSnapshot {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as ObjectSnapshot;
  if (!Array.isArray(parsed.entries)) {
    throw new Error(`Invalid snapshot file (missing entries array): ${filePath}`);
  }
  return parsed;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function captureObjectSnapshot(
  client: SuiClient,
  objectIds: string[],
  network: string,
  rpcUrl: string,
  debug: boolean | undefined
): Promise<ObjectSnapshot> {
  const entries: SnapshotEntry[] = [];
  const groups = chunk(objectIds, MULTI_GET_OBJECTS_BATCH_SIZE);

  for (let i = 0; i < groups.length; i++) {
    const ids = groups[i];
    if (debug) {
      console.log(
        chalk.gray(`[debug] multiGetObjects batch=${i + 1}/${groups.length} size=${ids.length}`)
      );
    }
    const responses = await client.multiGetObjects({
      ids,
      options: {
        showType: true,
        showOwner: true,
        showPreviousTransaction: true,
        showStorageRebate: true
      }
    });

    for (let responseIndex = 0; responseIndex < ids.length; responseIndex++) {
      const objectId = ids[responseIndex];
      const response = responses[responseIndex];
      if (!response) {
        entries.push({
          objectId,
          version: '-',
          digest: '-',
          status: 'error',
          error: 'Object response missing in RPC batch result'
        });
        continue;
      }
      entries.push(normalizeSnapshotEntry(objectId, response));
    }
  }

  entries.sort((a, b) => a.objectId.localeCompare(b.objectId));
  return {
    generatedAt: new Date().toISOString(),
    network,
    rpcUrl,
    entries
  };
}

const commandModule: CommandModule<Options, Options> = {
  command: 'snapshot',
  describe: 'Capture and diff Sui object snapshots for audit-grade state comparisons',
  builder(yargs) {
    return yargs.options({
      network: {
        type: 'string',
        choices: ['mainnet', 'testnet', 'devnet', 'localnet', 'default'],
        default: 'default',
        desc: 'Node network (mainnet/testnet/devnet/localnet)'
      },
      'rpc-url': {
        type: 'string',
        desc: 'Optional RPC URL override'
      },
      objects: {
        type: 'string',
        desc: 'Comma or whitespace separated object IDs for capture mode'
      },
      'objects-file': {
        type: 'string',
        desc: 'File containing object IDs (one per line) for capture mode'
      },
      from: {
        type: 'string',
        desc: 'Snapshot JSON path (before state) for diff mode'
      },
      to: {
        type: 'string',
        desc: 'Snapshot JSON path (after state) for diff mode'
      },
      out: {
        type: 'string',
        desc: 'Output JSON path (snapshot in capture mode or diff result in diff mode)'
      },
      json: {
        type: 'boolean',
        default: false,
        desc: 'Print full JSON payload to stdout'
      },
      debug: {
        type: 'boolean',
        default: false,
        desc: 'Print debug details'
      }
    });
  },
  handler: async ({
    network,
    'rpc-url': rpcUrl,
    objects,
    'objects-file': objectsFile,
    from,
    to,
    out,
    json,
    debug
  }) => {
    try {
      if (network == 'default') {
        network = await getDefaultNetwork();
        console.log(chalk.yellow(`Use default network: [${network}]`));
      }

      if ((from && !to) || (!from && to)) {
        throw new Error('Diff mode requires both --from and --to');
      }

      if (from && to) {
        const fromSnapshot = readSnapshotFile(from);
        const toSnapshot = readSnapshotFile(to);
        const diff = diffSnapshotEntries(fromSnapshot.entries, toSnapshot.entries);
        if (json) {
          process.stdout.write(`${JSON.stringify(diff, null, 2)}\n`);
        } else {
          process.stdout.write(`${formatSnapshotDiffSummary(diff)}\n`);
          for (const item of diff.mutated.slice(0, 20)) {
            process.stdout.write(
              `  mutated ${item.objectId}: ${item.from.version}/${item.from.digest} -> ${item.to.version}/${item.to.digest}\n`
            );
          }
          if (diff.mutated.length > 20) {
            process.stdout.write(`  ... and ${diff.mutated.length - 20} more mutated objects\n`);
          }
        }

        if (out) {
          fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.writeFileSync(
            out,
            JSON.stringify(
              {
                generatedAt: new Date().toISOString(),
                from,
                to,
                diff
              },
              null,
              2
            ),
            'utf-8'
          );
          console.log(chalk.green(`Snapshot diff written to: ${out}`));
        }
        handlerExit();
        return;
      }

      const objectIds = dedupeObjectIds([
        ...parseInlineObjectIds(objects),
        ...(objectsFile ? parseObjectIdsFile(objectsFile) : [])
      ]);
      if (objectIds.length === 0) {
        throw new Error('Capture mode requires --objects or --objects-file');
      }

      const resolvedRpcUrl = rpcUrl || getFullnodeUrl(network);
      const client = new SuiClient({ url: resolvedRpcUrl });
      const snapshot = await captureObjectSnapshot(
        client,
        objectIds,
        network,
        resolvedRpcUrl,
        debug
      );
      const outputPath = out || '.reports/move/object-snapshot.json';
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), 'utf-8');

      const foundCount = snapshot.entries.filter((entry) => entry.status === 'found').length;
      const errorCount = snapshot.entries.length - foundCount;
      console.log(
        chalk.blue(
          `Snapshot captured: total=${snapshot.entries.length}, found=${foundCount}, errors=${errorCount}`
        )
      );
      console.log(chalk.green(`Snapshot written to: ${outputPath}`));

      if (json) {
        process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
      }
      handlerExit();
    } catch (error) {
      logError(error);
      handlerExit(1);
    }
  }
};

export default commandModule;
