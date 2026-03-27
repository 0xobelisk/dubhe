import { DubheConfig, SuiObject, SuiObjectAbility } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';

const DEFAULT_ABILITIES: SuiObjectAbility[] = ['key', 'store'];
const ABILITY_ORDER: SuiObjectAbility[] = ['key', 'store', 'copy', 'drop'];

export async function generateObjects(config: DubheConfig, path: string) {
  const objects = config.native?.sui?.objects;
  if (!objects || Object.keys(objects).length === 0) {
    return;
  }

  console.log('\n🧱 Starting Sui Objects Generation...');
  for (const [objectName, objectConfig] of Object.entries(objects)) {
    console.log(`     └─ ${objectName}: ${JSON.stringify(objectConfig)}`);
    const code = generateObjectCode(config.name, objectName, objectConfig);
    await formatAndWriteMove(code, `${path}/${objectName}.move`, 'formatAndWriteMove');
  }
}

function generateObjectCode(
  projectName: string,
  objectName: string,
  objectConfig: SuiObject
): string {
  const abilities = normalizeAbilities(objectConfig.abilities);
  const hasKey = abilities.includes('key');
  const fields = Object.entries(objectConfig.fields ?? {});

  if (hasKey && fields.some(([name]) => name === 'id')) {
    throw new Error(
      `Object '${objectName}' must not declare field 'id' when ability 'key' is enabled`
    );
  }

  if (!hasKey && fields.length === 0) {
    throw new Error(`Object '${objectName}' must define at least one field without 'key' ability`);
  }

  const abilityText = ABILITY_ORDER.filter((ability) => abilities.includes(ability)).join(', ');
  const structName = toPascalCase(objectName);

  const stringImportNeeded = fields.some(([_, fieldType]) => {
    const normalizedType = normalizeType(fieldType);
    return normalizedType === 'String' || normalizedType === 'vector<String>';
  });

  const customTypeImports = getCustomTypeImports(projectName, fields);
  const imports = [
    ...(hasKey ? ['use sui::object::{Self, UID};'] : []),
    ...(stringImportNeeded ? ['use std::ascii::String;'] : []),
    ...customTypeImports
  ];

  const structFields = [
    ...(hasKey ? ['        id: UID,'] : []),
    ...fields.map(([name, fieldType]) => `        ${name}: ${normalizeType(fieldType)},`)
  ].join('\n');

  const constructorParams = [
    ...fields.map(([name, fieldType]) => `${name}: ${normalizeType(fieldType)}`),
    ...(hasKey ? ['ctx: &mut TxContext'] : [])
  ].join(', ');

  const constructorAssignments = [
    ...(hasKey ? ['            id: object::new(ctx),'] : []),
    ...fields.map(([name]) => `            ${name},`)
  ].join('\n');

  const idGetter = hasKey
    ? `
    public fun id(self: &${structName}): ID {
        object::id(self)
    }`
    : '';

  const fieldGetters = fields
    .map(
      ([name, fieldType]) => `
    public fun ${name}(self: &${structName}): ${normalizeType(fieldType)} {
        self.${name}
    }`
    )
    .join('');

  const fieldSetters = fields
    .map(
      ([name, fieldType]) => `
    public(package) fun set_${name}(self: &mut ${structName}, value: ${normalizeType(fieldType)}) {
        self.${name} = value
    }`
    )
    .join('');

  return `module ${projectName}::${objectName} {
    ${imports.join('\n    ')}

    public struct ${structName} has ${abilityText} {
${structFields}
    }

    public fun new(${constructorParams}): ${structName} {
        ${structName} {
${constructorAssignments}
        }
    }${idGetter}${fieldGetters}${fieldSetters}
}`;
}

function normalizeAbilities(abilities?: SuiObjectAbility[]): SuiObjectAbility[] {
  const rawAbilities = abilities && abilities.length > 0 ? abilities : DEFAULT_ABILITIES;
  const deduped = [...new Set(rawAbilities)];
  for (const ability of deduped) {
    if (!ABILITY_ORDER.includes(ability)) {
      throw new Error(`Unsupported object ability '${ability}'`);
    }
  }
  return deduped;
}

function normalizeType(type: string): string {
  return type === 'string' ? 'String' : type;
}

function getCustomTypeImports(projectName: string, fields: Array<[string, string]>): string[] {
  const customTypes = [
    ...new Set(
      fields
        .map(([_, fieldType]) => normalizeType(fieldType))
        .filter((fieldType) => isLocalCustomType(fieldType))
    )
  ];

  return customTypes.map(
    (customType) => `use ${projectName}::${toSnakeCase(customType)}::${customType};`
  );
}

function isLocalCustomType(type: string): boolean {
  if (isBasicType(type)) {
    return false;
  }

  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(type);
}

function isBasicType(type: string): boolean {
  return [
    'address',
    'bool',
    'u8',
    'u16',
    'u32',
    'u64',
    'u128',
    'u256',
    'String',
    'vector<address>',
    'vector<bool>',
    'vector<u8>',
    'vector<u16>',
    'vector<vector<u8>>',
    'vector<u32>',
    'vector<u64>',
    'vector<u128>',
    'vector<u256>',
    'vector<String>'
  ].includes(type);
}

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map((word) => {
      if (/^\d+$/.test(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, '');
}
