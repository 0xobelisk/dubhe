import { DubheConfig } from '../../types';
import { ComponentType } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';

// For the dubhe framework package itself, use package-internal dapp_service functions.
// For DApp packages, use the public dapp_system API.
function getDappModuleName(projectName: string): string {
  return projectName === 'dubhe' ? 'dapp_service' : `dapp_system`;
}

// Returns the inline auth argument for dapp_system write functions.
// dapp_system::set_record / set_field / delete_record / delete_field all require a DappKey
// value as the first argument so that only code inside the DApp's own package (where
// dapp_key::new() is public(package)) can supply it, preventing external bypass.
// dapp_service functions (used by dubhe's own code) have no such parameter.
function authArg(projectName: string): string {
  return projectName !== 'dubhe' ? 'dapp_key::new(), ' : '';
}

// Returns the dapp_hub argument for set_record / set_field / set_global_record / set_global_field calls.
// dapp_system::set_record, set_field, set_global_record, and set_global_field all require &DappHub.
// Only the framework's own dubhe package calls dapp_service::* directly (no DappHub needed there).
function dappHubArg(projectName: string, _isGlobal: boolean): string {
  return projectName !== 'dubhe' ? 'dapp_hub, ' : '';
}

// Returns the dapp_hub parameter declaration for generated write function signatures.
// Applies to all non-dubhe projects (both global DappStorage and user UserStorage resources).
function dappHubParam(projectName: string, _isGlobal: boolean): string {
  return projectName !== 'dubhe' ? 'dapp_hub: &DappHub, ' : '';
}

// Returns the Move storage object type based on whether the resource is global.
function getStorageType(isGlobal: boolean): string {
  return isGlobal ? 'DappStorage' : 'UserStorage';
}

// Returns the storage param name used in generated function signatures.
function getStorageParamName(isGlobal: boolean): string {
  return isGlobal ? 'dapp_storage' : 'user_storage';
}

// Returns the correct record-access function names based on global flag and project.
function getRecordFns(projectName: string, isGlobal: boolean) {
  const mod = getDappModuleName(projectName);
  if (isGlobal) {
    return {
      set_record: `${mod}::set_global_record`,
      set_field: `${mod}::set_global_field`,
      get_field: `${mod}::get_global_field`,
      has_record: `${mod}::has_global_record`,
      ensure_has: `${mod}::ensure_has_global_record`,
      ensure_has_not: `${mod}::ensure_has_not_global_record`,
      delete_record: `${mod}::delete_global_record`,
      delete_field: `${mod}::delete_global_field`
    };
  }
  return {
    set_record: `${mod}::set_record`,
    set_field: `${mod}::set_field`,
    get_field: `${mod}::get_field`,
    has_record: `${mod}::has_record`,
    ensure_has: `${mod}::ensure_has_record`,
    ensure_has_not: `${mod}::ensure_has_not_record`,
    delete_record: `${mod}::delete_record`,
    delete_field: `${mod}::delete_field`
  };
}

export async function generateResources(config: DubheConfig, path: string) {
  console.log('\n📦 Starting Resources Generation...');

  for (const [componentName, resource] of Object.entries(config.resources)) {
    console.log(`     └─ ${componentName}: ${JSON.stringify(resource)}`);

    // Handle simple type cases
    if (typeof resource === 'string') {
      const code = generateSimpleComponentCode(config.name, componentName, resource, 'Onchain');
      await formatAndWriteMove(code, `${path}/${componentName}.move`, 'formatAndWriteMove');
      continue;
    }

    // Validate that resource has fields defined
    if (!resource.fields || Object.keys(resource.fields).length === 0) {
      throw new Error(
        `Resource '${componentName}' must have fields defined, but found empty object`
      );
    }

    // For resources, don't default to any keys - use what's defined or empty array
    if (!resource.keys) {
      resource.keys = [];
    }

    const code = generateComponentCode(config.name, componentName, resource);
    await formatAndWriteMove(code, `${path}/${componentName}.move`, 'formatAndWriteMove');
  }
}

function generateSimpleComponentCode(
  projectName: string,
  componentName: string,
  valueType: string,
  type: ComponentType = 'Onchain'
): string {
  const isEnum = !isBasicType(valueType);
  const enumModule = isEnum ? `${toSnakeCase(valueType)}` : '';
  const isOffchain = type === 'Offchain';
  // Simple types default to global=false (user storage)
  const isGlobal = false;
  const storageType = getStorageType(isGlobal);
  const storageParam = getStorageParamName(isGlobal);
  const fns = getRecordFns(projectName, isGlobal);

  const readFunctions = !isOffchain
    ? `
    public fun has(${storageParam}: &${storageType}): bool {
        let mut key_tuple = vector::empty();
        key_tuple.push_back(TABLE_NAME);
        ${fns.has_record}<DappKey>(${storageParam}, key_tuple)
    }

    public fun ensure_has(${storageParam}: &${storageType}) {
        let mut key_tuple = vector::empty();
        key_tuple.push_back(TABLE_NAME);
        ${fns.ensure_has}<DappKey>(${storageParam}, key_tuple)
    }

    public fun ensure_has_not(${storageParam}: &${storageType}) {
        let mut key_tuple = vector::empty();
        key_tuple.push_back(TABLE_NAME);
        ${fns.ensure_has_not}<DappKey>(${storageParam}, key_tuple)
    }

    public(package) fun delete(${storageParam}: &mut ${storageType}, ctx: &TxContext) {
        let mut key_tuple = vector::empty();
        key_tuple.push_back(TABLE_NAME);
        ${fns.delete_record}<DappKey>(${authArg(
        projectName
      )}${storageParam}, key_tuple, vector[b"value"], ctx);
    }

    public fun get(${storageParam}: &${storageType}): (${
        valueType === 'string' || valueType === 'String' ? 'String' : valueType
      }) {
        let mut key_tuple = vector::empty();
        key_tuple.push_back(TABLE_NAME);
        let value_raw = ${fns.get_field}<DappKey>(${storageParam}, key_tuple, b"value");
        let mut value_bcs = sui::bcs::new(value_raw);
        let value = ${buildParseExpr(
          projectName,
          valueType,
          'value_bcs',
          isEnum ? [{ type: valueType, module: enumModule }] : []
        )};
        (value)
    }
`
    : '';

  const storageImport = isGlobal
    ? projectName !== 'dubhe'
      ? `use dubhe::dapp_service::{Self, DappStorage, DappHub};`
      : `use dubhe::dapp_service::{Self, DappStorage};`
    : projectName !== 'dubhe'
    ? `use dubhe::dapp_service::{Self, UserStorage, DappHub};`
    : `use dubhe::dapp_service::{Self, UserStorage};`;

  return `module ${projectName}::${componentName} { 
    use sui::bcs::{to_bytes};
    use std::ascii::{string, String, into_bytes};
    use dubhe::table_id;
    ${storageImport}
    use dubhe::dapp_system;
    use ${projectName}::dapp_key;
    use ${projectName}::dapp_key::DappKey;
${
  isEnum && valueType !== 'string' && valueType !== 'String'
    ? `    use ${projectName}::${enumModule};
    use ${projectName}::${enumModule}::{${valueType}};`
    : ''
}

    const TABLE_NAME: vector<u8> = b"${componentName}";
    const OFFCHAIN: bool = ${type === 'Offchain'};

${readFunctions}
    public(package) fun set(${dappHubParam(
      projectName,
      isGlobal
    )}${storageParam}: &mut ${storageType}, value: ${
    valueType === 'string' || valueType === 'String' ? 'String' : valueType
  }, ctx: &mut TxContext) {
        let mut key_tuple = vector::empty();
        key_tuple.push_back(TABLE_NAME);
        let field_names = vector[b"value"];
        let value_tuple = encode(value);
        ${fns.set_record}<DappKey>(${authArg(projectName)}${dappHubArg(
    projectName,
    isGlobal
  )}${storageParam}, key_tuple, field_names, value_tuple, OFFCHAIN, ctx);
    }

    public fun encode(value: ${
      valueType === 'string' || valueType === 'String' ? 'String' : valueType
    }): vector<vector<u8>> {
        let mut value_tuple = vector::empty();
        value_tuple.push_back(${
          valueType === 'string' || valueType === 'String'
            ? `to_bytes(&into_bytes(value))`
            : valueType === 'vector<String>'
            ? `to_bytes(&value)`
            : isEnum
            ? `${projectName}::${enumModule}::encode(value)`
            : `to_bytes(&value)`
        });
        value_tuple
    }
}`;
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

function generateComponentCode(projectName: string, componentName: string, resource: any): string {
  const fields = resource.fields;
  const keys = resource.keys || [];
  const offchain = resource.offchain || false;
  const global = resource.global || false;
  const type: ComponentType = offchain ? 'Offchain' : 'Onchain';

  const isGlobal = global;
  const storageType = getStorageType(isGlobal);
  const storageParam = getStorageParamName(isGlobal);
  const fns = getRecordFns(projectName, isGlobal);

  // Check if all fields are keys
  const isAllKeys = Object.keys(fields).every((name) => keys.includes(name));

  // Generate field type and name lists, excluding fields in keys
  const valueFields = Object.entries(fields).filter(([name]) => !keys.includes(name));
  const valueFieldNames = valueFields.map(([name]) => name);

  // If there is only one value field, do not generate struct
  const isSingleValue = valueFieldNames.length === 1;

  // Enum types from value fields only (used for encode/decode logic)
  const enumTypes = valueFields
    .filter(([_, type]) => !isBasicType(type as string) && type !== 'string' && type !== 'String')
    .map(([_, type]) => ({
      type: type as string,
      module: `${toSnakeCase(type as string)}`
    }))
    .filter((item, index, self) => self.findIndex((t) => t.type === item.type) === index);

  // All enum types (key + value) for import statement generation
  const allEnumTypes = Object.entries(fields)
    .filter(([_, type]) => !isBasicType(type as string) && type !== 'string' && type !== 'String')
    .map(([_, type]) => ({
      type: type as string,
      module: `${toSnakeCase(type as string)}`
    }))
    .filter((item, index, self) => self.findIndex((t) => t.type === item.type) === index);

  // Generate table related functions
  const tableFunctions = generateTableFunctions(
    projectName,
    componentName,
    fields,
    keys,
    !isAllKeys && !isSingleValue,
    enumTypes,
    type,
    isGlobal,
    storageType,
    storageParam,
    fns
  );

  const storageImport = isGlobal
    ? projectName !== 'dubhe'
      ? `use dubhe::dapp_service::{Self, DappStorage, DappHub};`
      : `use dubhe::dapp_service::{Self, DappStorage};`
    : projectName !== 'dubhe'
    ? `use dubhe::dapp_service::{Self, UserStorage, DappHub};`
    : `use dubhe::dapp_service::{Self, UserStorage};`;

  // If all fields are keys or there is only one value field, do not generate struct related code
  if (isAllKeys || isSingleValue) {
    return `module ${projectName}::${componentName} { 
    use sui::bcs::{to_bytes};
    use std::ascii::{string, String, into_bytes};
    use dubhe::table_id;
    ${storageImport}
    use dubhe::dapp_system;
    use ${projectName}::dapp_key;
    use ${projectName}::dapp_key::DappKey;
${
  allEnumTypes.length > 0
    ? allEnumTypes
        .map(
          (e) => `    use ${projectName}::${e.module};
    use ${projectName}::${e.module}::{${e.type}};`
        )
        .join('\n')
    : ''
}

    const TABLE_NAME: vector<u8> = b"${componentName}";
    const OFFCHAIN: bool = ${offchain};

${tableFunctions}
}`;
  }

  // Generate struct fields, excluding fields in keys
  const structFields = valueFieldNames
    .map(
      (name) =>
        `        ${name}: ${
          fields[name] === 'string' || fields[name] === 'String'
            ? 'String'
            : fields[name] === 'vector<String>'
            ? 'vector<String>'
            : fields[name]
        },`
    )
    .join('\n');

  // Generate constructor parameters, only containing non-key fields
  const constructorParams = valueFieldNames
    .map(
      (name) =>
        `${name}: ${
          fields[name] === 'string' || fields[name] === 'String'
            ? 'String'
            : fields[name] === 'vector<String>'
            ? 'vector<String>'
            : fields[name]
        }`
    )
    .join(', ');

  // Generate constructor field assignments, only containing non-key fields
  const constructorAssignments = valueFieldNames.map((name) => `            ${name},`).join('\n');

  // Generate getter functions, excluding fields in keys
  const getters = valueFieldNames
    .map(
      (name) => `    public fun ${name}(self: &${toPascalCase(componentName)}): ${
        fields[name] === 'string' || fields[name] === 'String'
          ? 'String'
          : fields[name] === 'vector<String>'
          ? 'vector<String>'
          : fields[name]
      } {
        self.${name}
    }`
    )
    .join('\n\n');

  // Generate setter functions, excluding fields in keys
  const setters = valueFieldNames
    .map(
      (name) => `    public fun update_${name}(self: &mut ${toPascalCase(
        componentName
      )}, ${name}: ${
        fields[name] === 'string' || fields[name] === 'String'
          ? 'String'
          : fields[name] === 'vector<String>'
          ? 'vector<String>'
          : fields[name]
      }) {
        self.${name} = ${name}
    }`
    )
    .join('\n\n');

  return `module ${projectName}::${componentName} { 
    use sui::bcs::{to_bytes};
    use std::ascii::{string, String, into_bytes};
    use dubhe::table_id;
    ${storageImport}
    use dubhe::dapp_system;
    use ${projectName}::dapp_key;
    use ${projectName}::dapp_key::DappKey;
${
  allEnumTypes.length > 0
    ? allEnumTypes
        .map(
          (e) => `    use ${projectName}::${e.module};
    use ${projectName}::${e.module}::{${e.type}};`
        )
        .join('\n')
    : ''
}

    const TABLE_NAME: vector<u8> = b"${componentName}";
    const OFFCHAIN: bool = ${offchain};

    public struct ${toPascalCase(componentName)} has copy, drop, store {
${structFields}
    }

    public fun new(${constructorParams}): ${toPascalCase(componentName)} {
        ${toPascalCase(componentName)} {
${constructorAssignments}
        }
    }

${getters}

${setters}

${tableFunctions}
}`;
}

// Check if it is a basic type
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
    'string',
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

// Build a BCS peel expression for a single field, reading from bcsVar.
function buildParseExpr(
  projectName: string,
  fieldType: string,
  bcsVar: string,
  enumTypes: Array<{ type: string; module: string }>
): string {
  const isEnum = !isBasicType(fieldType);
  const enumType = isEnum ? enumTypes.find((e) => e.type === fieldType) : null;
  if (fieldType === 'string' || fieldType === 'String') {
    return `dubhe::bcs::peel_string(&mut ${bcsVar})`;
  }
  if (fieldType === 'vector<String>') {
    return `dubhe::bcs::peel_vec_string(&mut ${bcsVar})`;
  }
  if (isEnum && enumType) {
    return `${projectName}::${enumType.module}::decode(&mut ${bcsVar})`;
  }
  return `sui::bcs::peel_${getBcsType(fieldType)}(&mut ${bcsVar})`;
}

// Generate the three-line sequence that reads one named field from storage.
// Uses ${fieldName}_raw / ${fieldName}_bcs as readable temporary variable names.
function buildFieldReadLines(
  projectName: string,
  fns: ReturnType<typeof getRecordFns>,
  storageParam: string,
  fieldName: string,
  fieldType: string,
  _idx: number,
  enumTypes: Array<{ type: string; module: string }>
): string {
  const rawVar = `${fieldName}_raw`;
  const bcsVar = `${fieldName}_bcs`;
  return [
    `let ${rawVar} = ${fns.get_field}<DappKey>(${storageParam}, key_tuple, b"${fieldName}");`,
    `let mut ${bcsVar} = sui::bcs::new(${rawVar});`,
    `let ${fieldName} = ${buildParseExpr(projectName, fieldType, bcsVar, enumTypes)};`
  ].join('\n        ');
}

function generateTableFunctions(
  projectName: string,
  componentName: string,
  fields: Record<string, string>,
  keys: string[],
  includeStruct: boolean = true,
  enumTypes: Array<{ type: string; module: string }> = [],
  type: ComponentType = 'Onchain',
  isGlobal: boolean = false,
  storageType: string = 'UserStorage',
  storageParam: string = 'user_storage',
  fns: ReturnType<typeof getRecordFns> = getRecordFns('dubhe', false)
): string {
  // Separate key fields and non-key fields
  const valueFields = Object.entries(fields)
    .filter(([name]) => !keys.includes(name))
    .reduce((acc, [name, type]) => ({ ...acc, [name]: type }), {});

  const valueNames = Object.keys(valueFields);

  // Check if all fields are keys
  const isAllKeys = Object.keys(fields).every((name) => keys.includes(name));
  // Check if there is only one value field
  const isSingleValue = valueNames.length === 1;
  // Check if it's offchain
  const isOffchain = type === 'Offchain';

  // Generate key parameter list
  const keyParams = keys.length > 0 ? keys.map((k) => `${k}: ${fields[k]}`).join(', ') : '';

  // Generate key tuple related code
  const keyTupleCode =
    keys.length > 0
      ? `let mut key_tuple = vector::empty();
        key_tuple.push_back(TABLE_NAME);
        ${keys.map((k) => `key_tuple.push_back(to_bytes(&${k}));`).join('\n        ')}`
      : `let mut key_tuple = vector::empty();
        key_tuple.push_back(TABLE_NAME);`;

  // Generate has series functions - skip for offchain
  const hasFunctions = !isOffchain
    ? `    public fun has(${storageParam}: &${storageType}${
        keyParams ? ', ' : ''
      }${keyParams}): bool {
        ${keyTupleCode}
        ${fns.has_record}<DappKey>(${storageParam}, key_tuple)
    }

    public fun ensure_has(${storageParam}: &${storageType}${keyParams ? ', ' : ''}${keyParams}) {
        ${keyTupleCode}
        ${fns.ensure_has}<DappKey>(${storageParam}, key_tuple)
    }

    public fun ensure_has_not(${storageParam}: &${storageType}${
        keyParams ? ', ' : ''
      }${keyParams}) {
        ${keyTupleCode}
        ${fns.ensure_has_not}<DappKey>(${storageParam}, key_tuple)
    }
  `
    : '';

  // Generate delete function - skip for offchain.
  // Pass all field names to delete_record so it cleans up fields and the sentinel in one call.
  const fieldNamesLiteral = `vector[${valueNames.map((n) => `b"${n}"`).join(', ')}]`;
  const deleteFunction = !isOffchain
    ? `    public(package) fun delete(${storageParam}: &mut ${storageType}${
        keyParams ? ', ' : ''
      }${keyParams}${isGlobal ? '' : ', ctx: &TxContext'}) {
        ${keyTupleCode}
        ${fns.delete_record}<DappKey>(${authArg(
        projectName
      )}${storageParam}, key_tuple, ${fieldNamesLiteral}${isGlobal ? '' : ', ctx'});
    }`
    : '';

  // Generate individual getter / setter functions for each value field.
  // Only generated when there are multiple value fields; skipped for offchain.
  const getterSetters =
    !isSingleValue && !isOffchain
      ? valueNames
          .map((name) => {
            const fieldType = fields[name];
            const isEnum = !isBasicType(fieldType as string);
            const enumType = isEnum ? enumTypes.find((e) => e.type === fieldType) : null;

            return `    public fun get_${name}(${storageParam}: &${storageType}${
              keyParams ? ', ' : ''
            }${keyParams}): ${
              fieldType === 'string' || fieldType === 'String'
                ? 'String'
                : fieldType === 'vector<String>'
                ? 'vector<String>'
                : fieldType
            } {
        ${keyTupleCode}
        let ${name}_raw = ${fns.get_field}<DappKey>(${storageParam}, key_tuple, b"${name}");
        let mut ${name}_bcs = sui::bcs::new(${name}_raw);
        let ${name} = ${buildParseExpr(projectName, fieldType as string, `${name}_bcs`, enumTypes)};
        ${name}
    }

    public(package) fun set_${name}(${dappHubParam(
              projectName,
              isGlobal
            )}${storageParam}: &mut ${storageType}${keyParams ? ', ' : ''}${keyParams}, ${name}: ${
              fieldType === 'string' || fieldType === 'String'
                ? 'String'
                : fieldType === 'vector<String>'
                ? 'vector<String>'
                : fieldType
            }, ctx: &mut TxContext) {
        ${keyTupleCode}
        let value = ${
          fieldType === 'string' || fieldType === 'String'
            ? `to_bytes(&into_bytes(${name}))`
            : fieldType === 'vector<String>'
            ? `to_bytes(&${name})`
            : isEnum
            ? `${projectName}::${enumType?.module}::encode(${name})`
            : `to_bytes(&${name})`
        };
        ${fns.set_field}<DappKey>(${authArg(projectName)}${dappHubArg(
              projectName,
              isGlobal
            )}${storageParam}, key_tuple, b"${name}", value, ctx);
    }`;
          })
          .join('\n\n')
      : '';

  // Build the field-name vector literal used in set_record calls.
  const fieldNamesVec = `vector[${valueNames.map((n) => `b"${n}"`).join(', ')}]`;

  // Generate get and set functions
  const getSetFunctions = isAllKeys
    ? `    public(package) fun set(${dappHubParam(
        projectName,
        isGlobal
      )}${storageParam}: &mut ${storageType}${
        keyParams ? ', ' : ''
      }${keyParams}, ctx: &mut TxContext) {
        ${keyTupleCode}
        let field_names: vector<vector<u8>> = vector[];
        let value_tuple: vector<vector<u8>> = vector[];
        ${fns.set_record}<DappKey>(${authArg(projectName)}${dappHubArg(
        projectName,
        isGlobal
      )}${storageParam}, key_tuple, field_names, value_tuple, OFFCHAIN, ctx);
    }`
    : isSingleValue
    ? !isOffchain
      ? `    public fun get(${storageParam}: &${storageType}${
          keyParams ? ', ' : ''
        }${keyParams}): ${
          Object.values(valueFields)[0] === 'string' || Object.values(valueFields)[0] === 'String'
            ? 'String'
            : Object.values(valueFields)[0]
        } {
        ${keyTupleCode}
        let ${valueNames[0]}_raw = ${fns.get_field}<DappKey>(${storageParam}, key_tuple, b"${
          valueNames[0]
        }");
        let mut ${valueNames[0]}_bcs = sui::bcs::new(${valueNames[0]}_raw);
        let value = ${buildParseExpr(
          projectName,
          Object.values(valueFields)[0] as string,
          `${valueNames[0]}_bcs`,
          enumTypes
        )};
        value
    }

    public(package) fun set(${dappHubParam(
      projectName,
      isGlobal
    )}${storageParam}: &mut ${storageType}${keyParams ? ', ' : ''}${keyParams}, value: ${
          Object.values(valueFields)[0] === 'string' || Object.values(valueFields)[0] === 'String'
            ? 'String'
            : Object.values(valueFields)[0]
        }, ctx: &mut TxContext) {
        ${keyTupleCode}
        let field_names = vector[b"${valueNames[0]}"];
        let value_tuple = encode(value);
        ${fns.set_record}<DappKey>(${authArg(projectName)}${dappHubArg(
          projectName,
          isGlobal
        )}${storageParam}, key_tuple, field_names, value_tuple, OFFCHAIN, ctx);
    }`
      : `    public(package) fun set(${dappHubParam(
          projectName,
          isGlobal
        )}${storageParam}: &mut ${storageType}${keyParams ? ', ' : ''}${keyParams}, value: ${
          Object.values(valueFields)[0] === 'string' || Object.values(valueFields)[0] === 'String'
            ? 'String'
            : Object.values(valueFields)[0]
        }, ctx: &mut TxContext) {
        ${keyTupleCode}
        let field_names = vector[b"${valueNames[0]}"];
        let value_tuple = encode(value);
        ${fns.set_record}<DappKey>(${authArg(projectName)}${dappHubArg(
          projectName,
          isGlobal
        )}${storageParam}, key_tuple, field_names, value_tuple, OFFCHAIN, ctx);
    }`
    : !isOffchain
    ? `    public fun get(${storageParam}: &${storageType}${
        keyParams ? ', ' : ''
      }${keyParams}): (${Object.values(valueFields)
        .map((t) => (t === 'string' || t === 'String' ? 'String' : t))
        .join(', ')}) {
        ${keyTupleCode}
        ${valueNames
          .map((name, i) =>
            buildFieldReadLines(projectName, fns, storageParam, name, fields[name], i, enumTypes)
          )
          .join('\n        ')}
        (${valueNames.join(', ')})
    }

    public(package) fun set(${dappHubParam(
      projectName,
      isGlobal
    )}${storageParam}: &mut ${storageType}${keyParams ? ', ' : ''}${keyParams}, ${valueNames
        .map(
          (n) => `${n}: ${fields[n] === 'string' || fields[n] === 'String' ? 'String' : fields[n]}`
        )
        .join(', ')}, ctx: &mut TxContext) {
        ${keyTupleCode}
        let field_names = ${fieldNamesVec};
        let value_tuple = encode(${valueNames.join(', ')});
        ${fns.set_record}<DappKey>(${authArg(projectName)}${dappHubArg(
        projectName,
        isGlobal
      )}${storageParam}, key_tuple, field_names, value_tuple, OFFCHAIN, ctx);
    }`
    : `    public(package) fun set(${dappHubParam(
        projectName,
        isGlobal
      )}${storageParam}: &mut ${storageType}${keyParams ? ', ' : ''}${keyParams}, ${valueNames
        .map(
          (n) => `${n}: ${fields[n] === 'string' || fields[n] === 'String' ? 'String' : fields[n]}`
        )
        .join(', ')}, ctx: &mut TxContext) {
        ${keyTupleCode}
        let field_names = ${fieldNamesVec};
        let value_tuple = encode(${valueNames.join(', ')});
        ${fns.set_record}<DappKey>(${authArg(projectName)}${dappHubArg(
        projectName,
        isGlobal
      )}${storageParam}, key_tuple, field_names, value_tuple, OFFCHAIN, ctx);
    }`;

  // Generate struct related functions
  const structFunctions = includeStruct
    ? !isOffchain
      ? `    public fun get_struct(${storageParam}: &${storageType}${
          keyParams ? ', ' : ''
        }${keyParams}): ${toPascalCase(componentName)} {
        ${keyTupleCode}
        ${valueNames
          .map((name, i) =>
            buildFieldReadLines(projectName, fns, storageParam, name, fields[name], i, enumTypes)
          )
          .join('\n        ')}
        ${toPascalCase(componentName)} { ${valueNames.join(', ')} }
    }

    public(package) fun set_struct(${dappHubParam(
      projectName,
      isGlobal
    )}${storageParam}: &mut ${storageType}${
          keyParams ? ', ' : ''
        }${keyParams}, ${componentName}: ${toPascalCase(componentName)}, ctx: &mut TxContext) {
        ${keyTupleCode}
        let field_names = ${fieldNamesVec};
        let value_tuple = encode_struct(${componentName});
        ${fns.set_record}<DappKey>(${authArg(projectName)}${dappHubArg(
          projectName,
          isGlobal
        )}${storageParam}, key_tuple, field_names, value_tuple, OFFCHAIN, ctx);
    }`
      : `    public(package) fun set_struct(${dappHubParam(
          projectName,
          isGlobal
        )}${storageParam}: &mut ${storageType}${
          keyParams ? ', ' : ''
        }${keyParams}, ${componentName}: ${toPascalCase(componentName)}, ctx: &mut TxContext) {
        ${keyTupleCode}
        let field_names = ${fieldNamesVec};
        let value_tuple = encode_struct(${componentName});
        ${fns.set_record}<DappKey>(${authArg(projectName)}${dappHubArg(
          projectName,
          isGlobal
        )}${storageParam}, key_tuple, field_names, value_tuple, OFFCHAIN, ctx);
    }`
    : '';

  // Generate encode and decode functions
  const encodeDecodeFunctions = isSingleValue
    ? `    public fun encode(value: ${
        Object.values(valueFields)[0] === 'string' || Object.values(valueFields)[0] === 'String'
          ? 'String'
          : Object.values(valueFields)[0]
      }): vector<vector<u8>> {
        let mut value_tuple = vector::empty();
        value_tuple.push_back(${
          Object.values(valueFields)[0] === 'string' || Object.values(valueFields)[0] === 'String'
            ? `to_bytes(&into_bytes(value))`
            : Object.values(valueFields)[0] === 'vector<String>'
            ? `to_bytes(&value)`
            : !isBasicType(Object.values(valueFields)[0] as string)
            ? `${projectName}::${
                enumTypes.find((e) => e.type === Object.values(valueFields)[0])?.module
              }::encode(value)`
            : `to_bytes(&value)`
        });
        value_tuple
    }`
    : includeStruct
    ? !isOffchain
      ? `    public fun encode(${valueNames
          .map(
            (n) =>
              `${n}: ${fields[n] === 'string' || fields[n] === 'String' ? 'String' : fields[n]}`
          )
          .join(', ')}): vector<vector<u8>> {
        let mut value_tuple = vector::empty();
        ${valueNames
          .map((n) => {
            const fieldType = fields[n];
            const isEnum = !isBasicType(fieldType as string);
            const enumType = isEnum ? enumTypes.find((e) => e.type === fieldType) : null;
            return `value_tuple.push_back(${
              fieldType === 'string' || fieldType === 'String'
                ? `to_bytes(&into_bytes(${n}))`
                : fieldType === 'vector<String>'
                ? `to_bytes(&${n})`
                : isEnum
                ? `${projectName}::${enumType?.module}::encode(${n})`
                : `to_bytes(&${n})`
            });`;
          })
          .join('\n        ')}
        value_tuple
    }

    public fun encode_struct(${componentName}: ${toPascalCase(componentName)}): vector<vector<u8>> {
        encode(${valueNames.map((n) => `${componentName}.${n}`).join(', ')})
    }

    public fun decode(data: vector<u8>): ${toPascalCase(componentName)} {
        let mut bsc_type = sui::bcs::new(data);
        ${valueNames
          .map((n) => {
            const fieldType = fields[n];
            const isEnum = !isBasicType(fieldType as string);
            const enumType = isEnum ? enumTypes.find((e) => e.type === fieldType) : null;
            return `let ${n} = ${
              fieldType === 'string' || fieldType === 'String'
                ? `string(sui::bcs::peel_vec_u8(&mut bsc_type))`
                : fieldType === 'vector<String>'
                ? `dubhe::bcs::peel_vec_string(&mut bsc_type)`
                : isEnum
                ? `${projectName}::${enumType?.module}::decode(&mut bsc_type)`
                : `sui::bcs::peel_${getBcsType(fieldType)}(&mut bsc_type)`
            };`;
          })
          .join('\n        ')}
        ${toPascalCase(componentName)} {
            ${valueNames.map((n) => `${n},`).join('\n            ')}
        }
    }`
      : `    public fun encode(${valueNames
          .map(
            (n) =>
              `${n}: ${fields[n] === 'string' || fields[n] === 'String' ? 'String' : fields[n]}`
          )
          .join(', ')}): vector<vector<u8>> {
        let mut value_tuple = vector::empty();
        ${valueNames
          .map((n) => {
            const fieldType = fields[n];
            const isEnum = !isBasicType(fieldType as string);
            const enumType = isEnum ? enumTypes.find((e) => e.type === fieldType) : null;
            return `value_tuple.push_back(${
              fieldType === 'string' || fieldType === 'String'
                ? `to_bytes(&into_bytes(${n}))`
                : fieldType === 'vector<String>'
                ? `to_bytes(&${n})`
                : isEnum
                ? `${projectName}::${enumType?.module}::encode(${n})`
                : `to_bytes(&${n})`
            });`;
          })
          .join('\n        ')}
        value_tuple
    }

    public fun encode_struct(${componentName}: ${toPascalCase(componentName)}): vector<vector<u8>> {
        encode(${valueNames.map((n) => `${componentName}.${n}`).join(', ')})
    }`
    : '';

  // Filter out empty sections and join with proper spacing
  const sections = [
    hasFunctions,
    deleteFunction,
    getterSetters,
    getSetFunctions,
    structFunctions,
    encodeDecodeFunctions
  ].filter((section) => section.trim().length > 0);

  return sections.join('\n\n');
}

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map((word, _index) => {
      if (/^\d+$/.test(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

function getBcsType(type: string): string {
  if (type.startsWith('vector<')) {
    const innerType = type.slice(7, -1);
    if (innerType === 'vector<u8>') {
      return 'vec_vec_u8';
    }
    if (innerType === 'String') {
      return 'vec_string';
    }
    return `vec_${getBcsType(innerType)}`;
  }

  switch (type) {
    case 'u8':
      return 'u8';
    case 'u16':
      return 'u16';
    case 'u32':
      return 'u32';
    case 'u64':
      return 'u64';
    case 'u128':
      return 'u128';
    case 'u256':
      return 'u256';
    case 'bool':
      return 'bool';
    case 'address':
      return 'address';
    case 'String':
      return 'string';
    default:
      return type;
  }
}
