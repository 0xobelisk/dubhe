import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { formatTypescript } from './format';

export async function formatAndWriteMove(
  output: string,
  fullOutputPath: string,
  logPrefix?: string
): Promise<void> {
  // const formattedOutput = await formatMove(output);
  // console.log(formattedOutput)
  mkdirSync(dirname(fullOutputPath), { recursive: true });

  writeFileSync(fullOutputPath, output);
  if (logPrefix !== undefined) {
    console.log(`${logPrefix}: ${fullOutputPath}`);
  }
}

export async function formatAndWriteTypescript(
  output: string,
  fullOutputPath: string,
  logPrefix: string
): Promise<void> {
  const formattedOutput = await formatTypescript(output);

  mkdirSync(dirname(fullOutputPath), { recursive: true });

  writeFileSync(fullOutputPath, formattedOutput);
  console.log(`${logPrefix}: ${fullOutputPath}`);
}
