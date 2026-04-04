import { ErrorData, ErrorEntry } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';

function toErrorConstName(key: string): string {
  return (
    'E' +
    key
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')
  );
}

function getMessage(entry: ErrorEntry): string {
  return typeof entry === 'string' ? entry : entry.message;
}

export async function generateSchemaError(projectName: string, errors: ErrorData, path: string) {
  console.log('\n📦 Starting Schema Error Generation...');

  const entries = Object.entries(errors)
    .map(([name, entry]) => {
      const constName = toErrorConstName(name);
      const message = getMessage(entry as ErrorEntry);
      console.log(`     └─ ${name}: ${message}`);
      return [
        `    #[error]`,
        `    const ${constName}: vector<u8> = b"${message}";`,
        `    public fun ${name}(condition: bool) { assert!(condition, ${constName}) }`
      ].join('\n');
    })
    .join('\n\n');

  const code = `module ${projectName}::error {\n${entries}\n}\n`;

  await formatAndWriteMove(
    code,
    `${path}/src/${projectName}/sources/codegen/error.move`,
    'formatAndWriteMove'
  );
}
