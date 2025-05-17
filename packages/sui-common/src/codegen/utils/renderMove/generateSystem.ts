import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import { existsSync } from 'fs';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function generateSystemsAndTests(config: DubheConfig, srcPrefix: string) {
  if (!existsSync(`${srcPrefix}/src/${config.name}/sources/systems`)) {
    await fs.mkdir(`${srcPrefix}/src/${config.name}/sources/systems`, { recursive: true });
  }
  if (!existsSync(`${srcPrefix}/src/${config.name}/sources/tests`)) {
    await fs.mkdir(`${srcPrefix}/src/${config.name}/sources/tests`, { recursive: true });
  }
}
