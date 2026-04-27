import { DubheConfig, ComponentType, Component } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import { validateConfig } from '../validateConfig';

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

// dapp_system::set_record, set_field, set_global_record, and set_global_field no longer
// require &DappHub — fee rates and debt ceilings are hardcoded as constants in dapp_system
// and updated via package upgrade. These helpers always return empty strings.
function dappHubArg(_projectName: string, _isGlobal: boolean): string {
  return '';
}

function dappHubParam(_projectName: string, _isGlobal: boolean): string {
  return '';
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

  if (!config.resources) return;

  // Validate config before code generation
  validateConfig(config);

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

    const baseCode = generateComponentCode(config.name, componentName, resource);
    const extensionCode = generateAnnotationExtensions(
      config,
      componentName,
      resource as Component
    );

    // Merge extension functions into the base module
    const code = extensionCode ? baseCode.replace(/^}$/m, `\n${extensionCode}\n}`) : baseCode;

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
    ? `use dubhe::dapp_service::{Self, DappStorage};`
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
    ? `use dubhe::dapp_service::{Self, DappStorage};`
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

  // ctx helpers: global write functions (set_global_record, set_global_field) do not take
  // a TxContext parameter — fees are handled inside those functions without needing ctx.
  // Non-global write functions (set_record, set_field, delete_record) DO take ctx.
  const ctxParam = isGlobal ? '' : ', ctx: &mut TxContext';
  const ctxArg = isGlobal ? '' : ', ctx';

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
            }${ctxParam}) {
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
            )}${storageParam}, key_tuple, b"${name}", value${ctxArg});
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
      )}${storageParam}: &mut ${storageType}${keyParams ? ', ' : ''}${keyParams}${ctxParam}) {
        ${keyTupleCode}
        let field_names: vector<vector<u8>> = vector[];
        let value_tuple: vector<vector<u8>> = vector[];
        ${fns.set_record}<DappKey>(${authArg(projectName)}${dappHubArg(
        projectName,
        isGlobal
      )}${storageParam}, key_tuple, field_names, value_tuple, OFFCHAIN${ctxArg});
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
        }${ctxParam}) {
        ${keyTupleCode}
        let field_names = vector[b"${valueNames[0]}"];
        let value_tuple = encode(value);
        ${fns.set_record}<DappKey>(${authArg(projectName)}${dappHubArg(
          projectName,
          isGlobal
        )}${storageParam}, key_tuple, field_names, value_tuple, OFFCHAIN${ctxArg});
    }`
      : `    public(package) fun set(${dappHubParam(
          projectName,
          isGlobal
        )}${storageParam}: &mut ${storageType}${keyParams ? ', ' : ''}${keyParams}, value: ${
          Object.values(valueFields)[0] === 'string' || Object.values(valueFields)[0] === 'String'
            ? 'String'
            : Object.values(valueFields)[0]
        }${ctxParam}) {
        ${keyTupleCode}
        let field_names = vector[b"${valueNames[0]}"];
        let value_tuple = encode(value);
        ${fns.set_record}<DappKey>(${authArg(projectName)}${dappHubArg(
          projectName,
          isGlobal
        )}${storageParam}, key_tuple, field_names, value_tuple, OFFCHAIN${ctxArg});
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
        .join(', ')}${ctxParam}) {
        ${keyTupleCode}
        let field_names = ${fieldNamesVec};
        let value_tuple = encode(${valueNames.join(', ')});
        ${fns.set_record}<DappKey>(${authArg(projectName)}${dappHubArg(
        projectName,
        isGlobal
      )}${storageParam}, key_tuple, field_names, value_tuple, OFFCHAIN${ctxArg});
    }`
    : `    public(package) fun set(${dappHubParam(
        projectName,
        isGlobal
      )}${storageParam}: &mut ${storageType}${keyParams ? ', ' : ''}${keyParams}, ${valueNames
        .map(
          (n) => `${n}: ${fields[n] === 'string' || fields[n] === 'String' ? 'String' : fields[n]}`
        )
        .join(', ')}${ctxParam}) {
        ${keyTupleCode}
        let field_names = ${fieldNamesVec};
        let value_tuple = encode(${valueNames.join(', ')});
        ${fns.set_record}<DappKey>(${authArg(projectName)}${dappHubArg(
        projectName,
        isGlobal
      )}${storageParam}, key_tuple, field_names, value_tuple, OFFCHAIN${ctxArg});
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
        }${keyParams}, ${componentName}: ${toPascalCase(componentName)}${ctxParam}) {
        ${keyTupleCode}
        let field_names = ${fieldNamesVec};
        let value_tuple = encode_struct(${componentName});
        ${fns.set_record}<DappKey>(${authArg(projectName)}${dappHubArg(
          projectName,
          isGlobal
        )}${storageParam}, key_tuple, field_names, value_tuple, OFFCHAIN${ctxArg});
    }`
      : `    public(package) fun set_struct(${dappHubParam(
          projectName,
          isGlobal
        )}${storageParam}: &mut ${storageType}${
          keyParams ? ', ' : ''
        }${keyParams}, ${componentName}: ${toPascalCase(componentName)}${ctxParam}) {
        ${keyTupleCode}
        let field_names = ${fieldNamesVec};
        let value_tuple = encode_struct(${componentName});
        ${fns.set_record}<DappKey>(${authArg(projectName)}${dappHubArg(
          projectName,
          isGlobal
        )}${storageParam}, key_tuple, field_names, value_tuple, OFFCHAIN${ctxArg});
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
        let mut bcs_type = sui::bcs::new(data);
        ${valueNames
          .map((n) => {
            const fieldType = fields[n];
            const isEnum = !isBasicType(fieldType as string);
            const enumType = isEnum ? enumTypes.find((e) => e.type === fieldType) : null;
            return `let ${n} = ${
              fieldType === 'string' || fieldType === 'String'
                ? `string(sui::bcs::peel_vec_u8(&mut bcs_type))`
                : fieldType === 'vector<String>'
                ? `dubhe::bcs::peel_vec_string(&mut bcs_type)`
                : isEnum
                ? `${projectName}::${enumType?.module}::decode(&mut bcs_type)`
                : `sui::bcs::peel_${getBcsType(fieldType)}(&mut bcs_type)`
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

// ─── Annotation-based code extensions ────────────────────────────────────────

/**
 * Generate additional Move functions for a resource based on its annotations.
 * Returns a string of extra function bodies to inject into the module, or '' if none.
 */
function generateAnnotationExtensions(
  config: DubheConfig,
  componentName: string,
  comp: Component
): string {
  const parts: string[] = [];
  const projectName = config.name;
  const mod = getDappModuleName(projectName);
  const auth = authArg(projectName);

  const fields = comp.fields;
  const keys = comp.keys ?? [];
  const valueFields = Object.entries(fields).filter(([n]) => !keys.includes(n));
  const valueNames = valueFields.map(([n]) => n);
  const keyParams = keys.length > 0 ? keys.map((k) => `${k}: ${fields[k]}`).join(', ') : '';

  // ── fungible: true ────────────────────────────────────────────────────────
  if (comp.fungible && valueNames.length === 1) {
    const [_vName, vType] = valueFields[0];
    parts.push(`
    // ─── fungible add / sub ─────────────────────────────────────────────
    #[error]
    const EInsufficientAmount: vector<u8> = b"Insufficient amount";

    public(package) fun add(user_storage: &mut UserStorage, amount: ${vType}, ctx: &mut TxContext) {
        let current = if (has(user_storage)) { get(user_storage) } else { 0 };
        set(user_storage, current + amount, ctx);
    }

    public(package) fun sub(user_storage: &mut UserStorage, amount: ${vType}, ctx: &mut TxContext) {
        let current = get(user_storage);
        assert!(current >= amount, EInsufficientAmount);
        set(user_storage, current - amount, ctx);
    }`);
  }

  // ── unique: true (with keys) ──────────────────────────────────────────────
  if (comp.unique && keys.length > 0) {
    const idField = keys[0];
    const idType = fields[idField] ?? 'u64';
    const valueParams = valueNames.map((n) => `${n}: ${fields[n]}`).join(', ');
    const valueArgs = valueNames.join(', ');

    parts.push(`
    // ─── unique: mint with auto-generated item_id ───────────────────────
    public(package) fun mint(
        user_storage: &mut UserStorage,
        ${valueParams},
        ctx: &mut TxContext,
    ): ${idType} {
        let addr = ctx.fresh_object_address();
        let ${idField} = (sui::address::to_u256(addr) & 0xFFFFFFFFFFFFFFFF as u256) as u64;
        ensure_has_not(user_storage, ${idField});
        set(user_storage, ${idField}, ${valueArgs}, ctx);
        ${idField}
    }`);
  }

  // ── reactive: true ────────────────────────────────────────────────────────
  if (comp.reactive) {
    const keyTupleCode =
      keys.length > 0
        ? `let mut key_tuple = vector::empty();\n        key_tuple.push_back(TABLE_NAME);\n        ${keys
            .map((k) => `key_tuple.push_back(sui::bcs::to_bytes(&${k}));`)
            .join('\n        ')}`
        : `let mut key_tuple = vector::empty();\n        key_tuple.push_back(TABLE_NAME);`;

    // Full reactive set
    if (valueNames.length > 1) {
      const params = valueNames.map((n) => `${n}: ${fields[n]}`).join(', ');
      parts.push(`
    // ─── reactive: cross-user write variants ───────────────────────────
    public(package) fun set_reactive(
        meta:   &dubhe::dapp_service::SceneMetadata,
        from:   &mut UserStorage,
        target: &mut UserStorage,
        ${keyParams ? keyParams + ', ' : ''}${params},
        ctx:    &mut TxContext,
    ) {
        ${keyTupleCode}
        let field_names = vector[${valueNames.map((n) => `b"${n}"`).join(', ')}];
        let value_tuple = encode(${valueNames.join(', ')});
        ${mod}::set_record_reactive<DappKey>(${auth}meta, from, target, key_tuple, field_names, value_tuple, ctx);
    }`);
    }

    // Per-field reactive setters
    for (const [fName, fType] of valueFields) {
      const encodeExpr =
        fType === 'string' || fType === 'String'
          ? `sui::bcs::to_bytes(&std::ascii::into_bytes(${fName}))`
          : `sui::bcs::to_bytes(&${fName})`;
      parts.push(`
    public(package) fun set_${fName}_reactive(
        meta:   &dubhe::dapp_service::SceneMetadata,
        from:   &mut UserStorage,
        target: &mut UserStorage,
        ${keyParams ? keyParams + ', ' : ''}${fName}: ${
        fType === 'string' || fType === 'String' ? 'String' : fType
      },
        ctx:    &mut TxContext,
    ) {
        ${keyTupleCode}
        let value = ${encodeExpr};
        ${mod}::set_field_reactive<DappKey>(${auth}meta, from, target, key_tuple, b"${fName}", value, ctx);
    }`);
    }
  }

  // ── transferable: true — generate transfer functions ─────────────────────
  if (comp.transferable) {
    const objects = config.objects ?? {};
    const scenes = config.scenes ?? {};
    const isFungible = !!comp.fungible;
    const isUnique = !!comp.unique && keys.length > 0;
    const idField = isUnique ? keys[0] : null;

    for (const [objKey, objCfg] of Object.entries(objects)) {
      if (!(objCfg.accepts ?? []).includes(componentName)) continue;
      const ObjStruct = `${toPascalCase(objKey)}Storage`;
      const objMod = objKey;

      if (isFungible && valueNames.length === 1) {
        const [, vType] = valueFields[0];
        parts.push(`
    // ─── transferable: User ↔ ${ObjStruct} (fungible) ─────────────────
    public(package) fun transfer_user_to_${objKey}(
        user:   &mut UserStorage,
        target: &mut ${projectName}::${objMod}::${ObjStruct},
        amount: ${vType},
        ctx:    &mut TxContext,
    ) {
        sub(user, amount, ctx);
        ${projectName}::${objMod}::add_${componentName}(target, amount);
    }

    public(package) fun transfer_${objKey}_to_user(
        source: &mut ${projectName}::${objMod}::${ObjStruct},
        user:   &mut UserStorage,
        amount: ${vType},
        ctx:    &mut TxContext,
    ) {
        ${projectName}::${objMod}::sub_${componentName}(source, amount);
        add(user, amount, ctx);
    }`);
      } else if (isUnique && idField) {
        parts.push(`
    // ─── transferable: User ↔ ${ObjStruct} (unique) ────────────────────
    public(package) fun transfer_user_to_${objKey}(
        user:     &mut UserStorage,
        target:   &mut ${projectName}::${objMod}::${ObjStruct},
        ${idField}: u64,
        ctx:      &mut TxContext,
    ) {
        ensure_has(user, ${idField});
        let data = encode_struct(get_struct(user, ${idField}));
        delete(user, ${idField}, ctx);
        let raw: vector<u8> = sui::bcs::to_bytes(&data);
        ${projectName}::${objMod}::set_${componentName}_data(target, ${idField}, raw);
    }

    public(package) fun transfer_${objKey}_to_user(
        source:   &mut ${projectName}::${objMod}::${ObjStruct},
        user:     &mut UserStorage,
        ${idField}: u64,
        ctx:      &mut TxContext,
    ) {
        let raw = ${projectName}::${objMod}::remove_${componentName}_data(source, ${idField});
        let decoded = decode(raw);
        set_struct(user, ${idField}, decoded, ctx);
    }`);
      }
    }

    for (const [sceneKey, sceneCfg] of Object.entries(scenes)) {
      if (!(sceneCfg.accepts ?? []).includes(componentName)) continue;
      const SceneStruct = `${toPascalCase(sceneKey)}Storage`;
      const sceneMod = sceneKey;

      if (isFungible && valueNames.length === 1) {
        const [, vType] = valueFields[0];
        parts.push(`
    // ─── transferable: User ↔ ${SceneStruct} (fungible) ──────────────
    public(package) fun transfer_user_to_${sceneKey}(
        user:   &mut UserStorage,
        target: &mut ${projectName}::${sceneMod}::${SceneStruct},
        amount: ${vType},
        ctx:    &mut TxContext,
    ) {
        sub(user, amount, ctx);
        ${projectName}::${sceneMod}::add_${componentName}(target, amount);
    }

    // ★ No expiry check on withdraw direction — prevents asset lock-in expired scenes.
    public(package) fun transfer_${sceneKey}_to_user(
        source: &mut ${projectName}::${sceneMod}::${SceneStruct},
        user:   &mut UserStorage,
        amount: ${vType},
        ctx:    &mut TxContext,
    ) {
        ${projectName}::${sceneMod}::sub_${componentName}(source, amount);
        add(user, amount, ctx);
    }`);
      } else if (isUnique && idField) {
        parts.push(`
    // ─── transferable: User ↔ ${SceneStruct} (unique) ─────────────────
    public(package) fun transfer_user_to_${sceneKey}(
        user:   &mut UserStorage,
        target: &mut ${projectName}::${sceneMod}::${SceneStruct},
        ${idField}: u64,
        ctx:    &mut TxContext,
    ) {
        ensure_has(user, ${idField});
        let data = encode_struct(get_struct(user, ${idField}));
        delete(user, ${idField}, ctx);
        let raw: vector<u8> = sui::bcs::to_bytes(&data);
        ${projectName}::${sceneMod}::set_${componentName}_data(target, ${idField}, raw);
    }

    public(package) fun transfer_${sceneKey}_to_user(
        source: &mut ${projectName}::${sceneMod}::${SceneStruct},
        user:   &mut UserStorage,
        ${idField}: u64,
        ctx:    &mut TxContext,
    ) {
        let raw = ${projectName}::${sceneMod}::remove_${componentName}_data(source, ${idField});
        let decoded = decode(raw);
        set_struct(user, ${idField}, decoded, ctx);
    }`);
      }
    }
  }

  // ── listable: true ────────────────────────────────────────────────────────
  if (comp.listable) {
    const isFungible = !!comp.fungible;
    const isUnique = !!comp.unique && keys.length > 0;
    const idField = isUnique ? keys[0] : null;
    const tableNameExpr = `b"${componentName}"`;

    if (isFungible && valueNames.length === 1) {
      // Fungible listing: list a specific amount
      parts.push(`
    // ─── listable: market protocol (fungible) ──────────────────────────
    public entry fun list(
        user_storage: &mut UserStorage,
        amount:       u64,
        price:        u64,
        listed_until: std::option::Option<u64>,
        ctx:          &mut TxContext,
    ) {
        dubhe::dapp_system::take_record<DappKey>(
            ${auth.replace(', ', '')}dapp_key::new(),
            user_storage,
            ${tableNameExpr},
            { let mut k = vector::empty(); k.push_back(TABLE_NAME); k },
            vector[b"${valueNames[0]}"],
            price,
            0,
            listed_until,
            ctx,
        );
    }`);
    } else if (isUnique && idField) {
      // Unique item listing
      parts.push(`
    // ─── listable: market protocol (unique) ────────────────────────────
    public entry fun list(
        user_storage: &mut UserStorage,
        ${idField}:   u64,
        price:        u64,
        listed_until: std::option::Option<u64>,
        ctx:          &mut TxContext,
    ) {
        let mut record_key = vector::empty();
        record_key.push_back(TABLE_NAME);
        record_key.push_back(sui::bcs::to_bytes(&${idField}));
        dubhe::dapp_system::take_record<DappKey>(
            dapp_key::new(),
            user_storage,
            ${tableNameExpr},
            record_key,
            vector[${valueNames.map((n) => `b"${n}"`).join(', ')}],
            price,
            0,
            listed_until,
            ctx,
        );
    }

    public entry fun buy(
        listing:      dubhe::dapp_service::Listing,
        user_storage: &mut UserStorage,
        payment:      sui::coin::Coin<sui::sui::SUI>,
        ctx:          &mut TxContext,
    ) {
        let price = dubhe::dapp_service::listing_price(&listing);
        assert!(sui::coin::value(&payment) >= price, 0);
        let seller = dubhe::dapp_service::listing_seller(&listing);
        sui::transfer::public_transfer(payment, seller);
        dubhe::dapp_system::restore_record<DappKey>(
            dapp_key::new(), listing, user_storage, ctx
        );
    }

    public entry fun cancel_listing(
        listing:      dubhe::dapp_service::Listing,
        user_storage: &mut UserStorage,
        ctx:          &TxContext,
    ) {
        dubhe::dapp_system::restore_record<DappKey>(
            dapp_key::new(), listing, user_storage, ctx
        );
    }

    public entry fun expire_listing(
        listing:      dubhe::dapp_service::Listing,
        user_storage: &mut UserStorage,
        ctx:          &TxContext,
    ) {
        dubhe::dapp_system::expire_listing<DappKey>(
            dapp_key::new(), listing, user_storage, ctx
        );
    }`);
    }
  }

  return parts.join('\n');
}
