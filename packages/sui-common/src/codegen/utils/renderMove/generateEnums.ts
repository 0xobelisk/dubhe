import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

export async function generateEnums(config: DubheConfig, path: string) {
  console.log('\n📦 Starting Enums Generation...');

  if (!config.enums) {
    return;
  }

  for (const [enumName, values] of Object.entries(config.enums)) {
    console.log(`     └─ ${enumName}: ${JSON.stringify(values)}`);

    // Sort enum values by first letter
    const sortedValues = [...values].sort((a, b) => a.localeCompare(b));

    const code = generateEnumCode(config.name, enumName, sortedValues);
    await formatAndWriteMove(code, `${path}/${toSnakeCase(enumName)}.move`, 'formatAndWriteMove');
  }
}

function generateEnumCode(projectName: string, enumName: string, values: string[]): string {
  const enumValues = values.map((v) => v.charAt(0).toUpperCase() + v.slice(1)).join(',');

  return `module ${projectName}::${toSnakeCase(enumName)} {
    use sui::bcs::{BCS, to_bytes, peel_enum_tag};

    public enum ${enumName} has copy, drop, store {
        ${enumValues}
    }

${values
  .map(
    (v) => `    public fun new_${v.toLowerCase()}(): ${enumName} {
        ${enumName}::${v.charAt(0).toUpperCase() + v.slice(1)}
    }`
  )
  .join('\n\n')}

    public fun encode(self: ${enumName}): vector<u8> {
        to_bytes(&self)
    }

    public fun decode(bytes: &mut BCS): ${enumName} {
        match(peel_enum_tag(bytes)) {
${values
  .map((v, i) => `            ${i} => ${enumName}::${v.charAt(0).toUpperCase() + v.slice(1)},`)
  .join('\n')}
            _ => abort,
        }
    }
}`;
}
