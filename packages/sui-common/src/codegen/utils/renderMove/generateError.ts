import { BaseType, ErrorData, SchemaType } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import {
  getStructAttrsWithType,
  getStructAttrs,
  getStructTypes,
  getStructAttrsQuery
} from './common';

function convertToSnakeCase(input: string): string {
  return input
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

export async function generateSchemaError(projectName: string, errors: ErrorData, path: string) {
  console.log('\n📦 Starting Schema Error Generation...');

  let code = `module ${projectName}::errors {
		${Object.entries(errors)
      .map(([name, message]) => {
        console.log(`     └─ ${name}: ${message}`);
        return `#[error]
				const ${name.toUpperCase()}: vector<u8> = b"${message}";
				public fun ${name}_error(condition: bool) { assert!(condition, ${name.toUpperCase()})  }
		`;
      })
      .join('\n')}		
            }`;

  await formatAndWriteMove(
    code,
    `${path}/src/${projectName}/sources/codegen/errors.move`,
    'formatAndWriteMove'
  );
}
