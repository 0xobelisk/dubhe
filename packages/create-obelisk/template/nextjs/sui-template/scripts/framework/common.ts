import * as fsAsync from 'fs/promises';
import { FrameworkDeploymentJsonType } from './types';

export async function getFrameworkDeploymentJson(
  projectPath: string,
  network: string,
): Promise<FrameworkDeploymentJsonType> {
  try {
    const data = await fsAsync.readFile(
      `${projectPath}/localnet/obelisk-framework/.history/sui_${network}/latest.json`,
      'utf8',
    );
    return JSON.parse(data) as FrameworkDeploymentJsonType;
  } catch {
    throw new Error('Failed to read deployment history file');
  }
}
