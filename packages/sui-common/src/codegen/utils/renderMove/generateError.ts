import { ErrorData } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';

export async function generateSchemaError(projectName: string, errors: ErrorData, path: string) {
  console.log('\n📦 Starting Schema Error Generation...');

  const entries = Object.entries(errors)
    .map(([name, message]) => {
      console.log(`     └─ ${name}: ${message}`);
      return [
        `    #[error]`,
        `    const ${name.toUpperCase()}: vector<u8> = b"${message}";`,
        `    public fun ${name}_error(condition: bool) { assert!(condition, ${name.toUpperCase()}) }`
      ].join('\n');
    })
    .join('\n\n');

  let code = `module ${projectName}::errors {\n${entries}\n}\n`;

  await formatAndWriteMove(
    code,
    `${path}/src/${projectName}/sources/codegen/errors.move`,
    'formatAndWriteMove'
  );
}
