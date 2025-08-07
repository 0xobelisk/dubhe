import { DubheConfig } from '../../types';
import { ComponentType } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';

function getDappModuleName(projectName: string): string {
  return projectName === 'dubhe' ? 'dapp_service' : `dapp_system`;
}

export async function generateResources(config: DubheConfig, path: string) {
  console.log('\n📦 Starting Resources Generation...');
  
  for (const [componentName, resource] of Object.entries(config.resources)) {
    console.log(`     └─ ${componentName}: ${JSON.stringify(resource)}`);
    
    // Handle simple type cases
    if (typeof resource === 'string') {
      const code = generateSimpleComponentCode(config.name, componentName, resource, 'Onchain');
      await formatAndWriteMove(
        code,
        `${path}/${componentName}.move`,
        'formatAndWriteMove'
      );
      continue;
    }

    // Validate that resource has fields defined
    if (!resource.fields || Object.keys(resource.fields).length === 0) {
      throw new Error(`Resource '${componentName}' must have fields defined, but found empty object`);
    }

    // For resources, don't default to any keys - use what's defined or empty array
    if (!resource.keys) {
      resource.keys = [];
    }
    
    const offchain = resource.offchain || false;
    const type: ComponentType = offchain ? 'Offchain' : 'Onchain';
    
    const code = generateComponentCode(config.name, componentName, resource);
    await formatAndWriteMove(
      code,
      `${path}/${componentName}.move`,
      'formatAndWriteMove'
    );
  }
}

function generateSimpleComponentCode(projectName: string, componentName: string, valueType: string, type: ComponentType = 'Onchain'): string {
  // Check if it's an enum type
  const isEnum = !isBasicType(valueType);
  const enumModule = isEnum ? `${toSnakeCase(valueType)}` : '';
  
  return `module ${projectName}::${componentName} { 
    use sui::bcs::{to_bytes};
    use std::ascii::{string, String, into_bytes};
    use dubhe::table_id;
    use dubhe::dapp_service::{Self, DappHub};
    use dubhe::dapp_system;
    use ${projectName}::dapp_key;
    use ${projectName}::dapp_key::DappKey;
${isEnum && valueType !== 'string' && valueType !== 'String' ? `    use ${projectName}::${enumModule};
    use ${projectName}::${enumModule}::{${valueType}};` : ''}

    const TABLE_NAME: vector<u8> = b"${componentName}";
    const TABLE_TYPE: vector<u8> = b"Resource";
    const OFFCHAIN: bool = ${type === 'Offchain'};

    public fun get_table_id(): String {
        string(TABLE_NAME)
    }

    public fun get_key_schemas(): vector<String> { 
        vector[]
    }

    public fun get_value_schemas(): vector<String> { 
        vector[string(b"${valueType}")]
    }

    public fun get_key_names(): vector<String> { 
        vector[]
    }

    public fun get_value_names(): vector<String> { 
        vector[string(b"value")]
    }

    public(package) fun register_table(dapp_hub: &mut DappHub, ctx: &mut TxContext) {
        let dapp_key = dapp_key::new();
        ${getDappModuleName(projectName)}::register_table(
            dapp_hub,
             dapp_key,
            string(TABLE_TYPE),
            get_table_id(), 
            get_key_schemas(), 
            get_key_names(), 
            get_value_schemas(), 
            get_value_names(), 
            OFFCHAIN,
            ctx
        );
    }

    public fun has(dapp_hub: &DappHub): bool {
        let key_tuple = vector::empty();
        ${getDappModuleName(projectName)}::has_record<DappKey>(dapp_hub, get_table_id(), key_tuple)
    }

    public(package) fun delete(dapp_hub: &mut DappHub) {
        let key_tuple = vector::empty();
        ${getDappModuleName(projectName)}::delete_record<DappKey>(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, OFFCHAIN);
    }

    public fun get(dapp_hub: &DappHub): (${valueType === 'string' || valueType === 'String' ? 'String' : valueType}) {
        let key_tuple = vector::empty();
        let value_tuple = ${getDappModuleName(projectName)}::get_record<DappKey>(dapp_hub, get_table_id(), key_tuple);
        let mut bsc_type = sui::bcs::new(value_tuple);
        ${valueType === 'string' || valueType === 'String' ? `let value = dubhe::bcs::peel_string(&mut bsc_type);` : valueType === 'vector<String>' ? `let value = dubhe::bcs::peel_vec_string(&mut bsc_type);` : isEnum ? `let value = ${projectName}::${enumModule}::decode(&mut bsc_type);` : `let value = sui::bcs::peel_${getBcsType(valueType)}(&mut bsc_type);`}
        (value)
    }

    public(package) fun set(dapp_hub: &mut DappHub, value: ${valueType === 'string' || valueType === 'String' ? 'String' : valueType}) {
        let key_tuple = vector::empty();
        let value_tuple = encode(value);
        ${getDappModuleName(projectName)}::set_record(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, value_tuple, OFFCHAIN);
    }

    public fun encode(value: ${valueType === 'string' || valueType === 'String' ? 'String' : valueType}): vector<vector<u8>> {
        let mut value_tuple = vector::empty();
        value_tuple.push_back(${valueType === 'string' || valueType === 'String' ? `to_bytes(&into_bytes(value))` : valueType === 'vector<String>' ? `to_bytes(&value)` : isEnum ? `${projectName}::${enumModule}::encode(value)` : `to_bytes(&value)`});
        value_tuple
    }
}`;
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

function generateComponentCode(projectName: string, componentName: string, resource: any): string {
  const fields = resource.fields;
  const keys = resource.keys || [];
  const offchain = resource.offchain || false;
  const type: ComponentType = offchain ? 'Offchain' : 'Onchain';
  
  // Check if all fields are keys
  const isAllKeys = Object.keys(fields).every(name => keys.includes(name));
  
  // Generate field type and name lists, excluding fields in keys
  const valueFields = Object.entries(fields)
    .filter(([name]) => !keys.includes(name));
  const valueFieldNames = valueFields.map(([name]) => name);
  
  // If there is only one value field, do not generate struct
  const isSingleValue = valueFieldNames.length === 1;

  // Get all enum type fields and their corresponding module names
  const enumTypes = valueFields
    .filter(([_, type]) => !isBasicType(type as string) && type !== 'string' && type !== 'String')
    .map(([_, type]) => ({
      type: type as string,
      module: `${toSnakeCase(type as string)}`
    }))
    .filter((item, index, self) => 
      self.findIndex(t => t.type === item.type) === index
    );
  
  // Generate table related functions
  const tableFunctions = generateTableFunctions(projectName, componentName, fields, keys, !isAllKeys && !isSingleValue, enumTypes, type);

  // If all fields are keys or there is only one value field, do not generate struct related code
  if (isAllKeys || isSingleValue) {
    return `module ${projectName}::${componentName} { 
    use sui::bcs::{to_bytes};
    use std::ascii::{string, String, into_bytes};
    use dubhe::table_id;
    use dubhe::dapp_service::{Self, DappHub};
    use dubhe::dapp_system;
    use ${projectName}::dapp_key;
    use ${projectName}::dapp_key::DappKey;
${enumTypes.length > 0 ? enumTypes.map(e => `    use ${projectName}::${e.module};
    use ${projectName}::${e.module}::{${e.type}};`).join('\n') : ''}

    const TABLE_NAME: vector<u8> = b"${componentName}";
    const TABLE_TYPE: vector<u8> = b"Resource";
    const OFFCHAIN: bool = ${type === 'Offchain'};

${tableFunctions}
}`;
  }

  // Generate struct fields, excluding fields in keys
  const structFields = valueFieldNames
    .map(name => `        ${name}: ${fields[name] === 'string' || fields[name] === 'String' ? 'String' : fields[name] === 'vector<String>' ? 'vector<String>' : fields[name]},`)
    .join('\n');

  // Generate constructor parameters, only containing non-key fields
  const constructorParams = valueFieldNames
    .map(name => `${name}: ${fields[name] === 'string' || fields[name] === 'String' ? 'String' : fields[name] === 'vector<String>' ? 'vector<String>' : fields[name]}`)
    .join(', ');

  // Generate constructor field assignments, only containing non-key fields
  const constructorAssignments = valueFieldNames
    .map(name => `            ${name},`)
    .join('\n');

  // Generate getter functions, excluding fields in keys
  const getters = valueFieldNames
    .map(name => `    public fun ${name}(self: &${toPascalCase(componentName)}): ${fields[name] === 'string' || fields[name] === 'String' ? 'String' : fields[name] === 'vector<String>' ? 'vector<String>' : fields[name]} {
        self.${name}
    }`)
    .join('\n\n');

  // Generate setter functions, excluding fields in keys
  const setters = valueFieldNames
    .map(name => `    public fun update_${name}(self: &mut ${toPascalCase(componentName)}, ${name}: ${fields[name] === 'string' || fields[name] === 'String' ? 'String' : fields[name] === 'vector<String>' ? 'vector<String>' : fields[name]}) {
        self.${name} = ${name}
    }`)
    .join('\n\n');

  return `module ${projectName}::${componentName} { 
    use sui::bcs::{to_bytes};
    use std::ascii::{string, String, into_bytes};
    use dubhe::table_id;
    use dubhe::dapp_service::{Self, DappHub};
    use dubhe::dapp_system;
    use ${projectName}::dapp_key;
    use ${projectName}::dapp_key::DappKey;
${enumTypes.length > 0 ? enumTypes.map(e => `    use ${projectName}::${e.module};
    use ${projectName}::${e.module}::{${e.type}};`).join('\n') : ''}

    const TABLE_NAME: vector<u8> = b"${componentName}";
    const TABLE_TYPE: vector<u8> = b"Resource";
    const OFFCHAIN: bool = ${type === 'Offchain'};

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
  return ['address', 'bool', 'u8', 'u32', 'u64', 'u128', 'u256', 
    'string', 'String',
    'vector<address>', 'vector<bool>', 'vector<u8>', 'vector<vector<u8>>', 
    'vector<u32>', 'vector<u64>', 'vector<u128>', 'vector<u256>',
    'vector<String>'].includes(type);
}

function generateTableFunctions(
  projectName: string,
  componentName: string,
  fields: Record<string, string>,
  keys: string[],
  includeStruct: boolean = true,
  enumTypes: Array<{type: string, module: string}> = [],
  type: ComponentType = 'Onchain'
): string {
  // Separate key fields and non-key fields
  const keyFields = keys.reduce((acc, key) => ({ ...acc, [key]: fields[key] }), {});
  const valueFields = Object.entries(fields)
    .filter(([name]) => !keys.includes(name))
    .reduce((acc, [name, type]) => ({ ...acc, [name]: type }), {});
  
  const keyNames = Object.keys(keyFields);
  const valueNames = Object.keys(valueFields);

  // Check if all fields are keys
  const isAllKeys = Object.keys(fields).every(name => keys.includes(name));
  // Check if there is only one value field
  const isSingleValue = valueNames.length === 1;

  // Generate key parameter list, if keys are empty, return empty string
  const keyParams = keys.length > 0 
    ? keys.map(k => `${k}: ${fields[k]}`).join(', ')
    : '';
  
  // Generate key tuple related code, if keys are empty, return empty string
  const keyTupleCode = keys.length > 0
    ? `let mut key_tuple = vector::empty();
        ${keys.map(k => `key_tuple.push_back(to_bytes(&${k}));`).join('\n        ')}`
    : 'let key_tuple = vector::empty();';
  
  // Generate table ID related functions
  const tableIdFunctions = `    public fun get_table_id(): String {
        string(TABLE_NAME)
    }

    public fun get_key_schemas(): vector<String> { 
        vector[${keys.map(k => `string(b"${fields[k]}")`).join(', ')}]
    }

    public fun get_value_schemas(): vector<String> { 
        vector[${Object.values(valueFields).map(t => `string(b"${t}")`).join(', ')}]
    }

    public fun get_key_names(): vector<String> { 
        vector[${keys.map(k => `string(b"${k}")`).join(', ')}]
    }

    public fun get_value_names(): vector<String> { 
        vector[${valueNames.map(n => `string(b"${n}")`).join(', ')}]
    }`;

  // Generate register table function
  const registerFunction = `    public(package) fun register_table(dapp_hub: &mut DappHub, ctx: &mut TxContext) {
        let dapp_key = dapp_key::new();
        ${getDappModuleName(projectName)}::register_table(
            dapp_hub,
             dapp_key,
            string(TABLE_TYPE),
            get_table_id(), 
            get_key_schemas(), 
            get_key_names(), 
            get_value_schemas(), 
            get_value_names(), 
            OFFCHAIN,
            ctx
        );
    }`;

  // Generate has series functions
  const hasFunctions = `    public fun has(dapp_hub: &DappHub${keyParams ? ', ' + keyParams : ''}): bool {
        ${keyTupleCode}
        ${getDappModuleName(projectName)}::has_record<DappKey>(dapp_hub, get_table_id(), key_tuple)
    }

    public fun ensure_has(dapp_hub: &DappHub${keyParams ? ', ' + keyParams : ''}) {
        ${keyTupleCode}
        ${getDappModuleName(projectName)}::ensure_has_record<DappKey>(dapp_hub, get_table_id(), key_tuple)
    }

    public fun ensure_not_has(dapp_hub: &DappHub${keyParams ? ', ' + keyParams : ''}) {
        ${keyTupleCode}
        ${getDappModuleName(projectName)}::ensure_not_has_record<DappKey>(dapp_hub, get_table_id(), key_tuple)
    }
  `;

  // Generate delete function
  const deleteFunction = `    public(package) fun delete(dapp_hub: &mut DappHub${keyParams ? ', ' + keyParams : ''}) {
        ${keyTupleCode}
        ${getDappModuleName(projectName)}::delete_record<DappKey>(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, OFFCHAIN);
    }`;

  // Generate getter and setter functions, only generated when there are multiple value fields
  const getterSetters = !isSingleValue ? valueNames.map(name => {
    const index = valueNames.indexOf(name);
    const fieldType = fields[name];
    const isEnum = !isBasicType(fieldType as string);
    const enumType = isEnum ? enumTypes.find(e => e.type === fieldType) : null;
    
    return `    public fun get_${name}(dapp_hub: &DappHub${keyParams ? ', ' + keyParams : ''}): ${fieldType === 'string' || fieldType === 'String' ? 'String' : fieldType === 'vector<String>' ? 'vector<String>' : fieldType} {
        ${keyTupleCode}
        let value = ${getDappModuleName(projectName)}::get_field<DappKey>(dapp_hub, get_table_id(), key_tuple, ${index});
        let mut bsc_type = sui::bcs::new(value);
        ${fieldType === 'string' || fieldType === 'String' ? `let ${name} = dubhe::bcs::peel_string(&mut bsc_type);` : fieldType === 'vector<String>' ? `let ${name} = dubhe::bcs::peel_vec_string(&mut bsc_type);` : isEnum ? `let ${name} = ${projectName}::${enumType?.module}::decode(&mut bsc_type);` : `let ${name} = sui::bcs::peel_${getBcsType(fieldType)}(&mut bsc_type);`}
        ${name}
    }

    public(package) fun set_${name}(dapp_hub: &mut DappHub${keyParams ? ', ' + keyParams : ''}, ${name}: ${fieldType === 'string' || fieldType === 'String' ? 'String' : fieldType === 'vector<String>' ? 'vector<String>' : fieldType}) {
        ${keyTupleCode}
        let value = ${fieldType === 'string' || fieldType === 'String' ? `to_bytes(&into_bytes(${name}))` : fieldType === 'vector<String>' ? `to_bytes(&${name})` : isEnum ? `${projectName}::${enumType?.module}::encode(${name})` : `to_bytes(&${name})`};
        ${getDappModuleName(projectName)}::set_field(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, ${index}, value, OFFCHAIN);
    }`;
  }).join('\n\n') : '';

  // Generate get and set functions
  const getSetFunctions = isAllKeys 
    ? `    public(package) fun set(dapp_hub: &mut DappHub${keyParams ? ', ' + keyParams : ''}) {
        ${keyTupleCode}
        let value_tuple = vector::empty();
        ${getDappModuleName(projectName)}::set_record(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, value_tuple, OFFCHAIN);
    }`
    : isSingleValue
    ? `    public fun get(dapp_hub: &DappHub${keyParams ? ', ' + keyParams : ''}): ${Object.values(valueFields)[0] === 'string' || Object.values(valueFields)[0] === 'String' ? 'String' : Object.values(valueFields)[0]} {
        ${keyTupleCode}
        let value = ${getDappModuleName(projectName)}::get_field<DappKey>(dapp_hub, get_table_id(), key_tuple, 0);
        let mut bsc_type = sui::bcs::new(value);
        ${Object.values(valueFields)[0] === 'string' || Object.values(valueFields)[0] === 'String'
          ? `let value = dubhe::bcs::peel_string(&mut bsc_type);` 
          : Object.values(valueFields)[0] === 'vector<String>'
          ? `let value = dubhe::bcs::peel_vec_string(&mut bsc_type);`
          : !isBasicType(Object.values(valueFields)[0] as string) 
          ? `let value = ${projectName}::${enumTypes.find(e => e.type === Object.values(valueFields)[0])?.module}::decode(&mut bsc_type);` 
          : `let value = sui::bcs::peel_${getBcsType(Object.values(valueFields)[0] as string)}(&mut bsc_type);`}
        value
    }

    public(package) fun set(dapp_hub: &mut DappHub${keyParams ? ', ' + keyParams : ''}, value: ${Object.values(valueFields)[0] === 'string' || Object.values(valueFields)[0] === 'String' ? 'String' : Object.values(valueFields)[0]}) {
        ${keyTupleCode}
        let value_tuple = encode(value);
        ${getDappModuleName(projectName)}::set_record(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, value_tuple, OFFCHAIN);
    }`
    : `    public fun get(dapp_hub: &DappHub${keyParams ? ', ' + keyParams : ''}): (${Object.values(valueFields).map(t => t === 'string' || t === 'String' ? 'String' : t).join(', ')}) {
        ${keyTupleCode}
        let value_tuple = ${getDappModuleName(projectName)}::get_record<DappKey>(dapp_hub, get_table_id(), key_tuple);
        let mut bsc_type = sui::bcs::new(value_tuple);
        ${valueNames.map(name => {
          const fieldType = fields[name];
          const isEnum = !isBasicType(fieldType as string);
          const enumType = isEnum ? enumTypes.find(e => e.type === fieldType) : null;
          return `let ${name} = ${fieldType === 'string' || fieldType === 'String' ? `dubhe::bcs::peel_string(&mut bsc_type)` : fieldType === 'vector<String>' ? `dubhe::bcs::peel_vec_string(&mut bsc_type)` : isEnum ? `${projectName}::${enumType?.module}::decode(&mut bsc_type)` : `sui::bcs::peel_${getBcsType(fieldType)}(&mut bsc_type)`};`;
        }).join('\n        ')}
        (${valueNames.join(', ')})
    }

    public(package) fun set(dapp_hub: &mut DappHub${keyParams ? ', ' + keyParams : ''}, ${valueNames.map(n => `${n}: ${fields[n] === 'string' || fields[n] === 'String' ? 'String' : fields[n]}`).join(', ')}) {
        ${keyTupleCode}
        let value_tuple = encode(${valueNames.join(', ')});
        ${getDappModuleName(projectName)}::set_record(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, value_tuple, OFFCHAIN);
    }`;

  // Generate struct related functions
  const structFunctions = includeStruct ? `    public fun get_struct(dapp_hub: &DappHub${keyParams ? ', ' + keyParams : ''}): ${toPascalCase(componentName)} {
        ${keyTupleCode}
        let value_tuple = ${getDappModuleName(projectName)}::get_record<DappKey>(dapp_hub, get_table_id(), key_tuple);
        decode(value_tuple)
    }

    public(package) fun set_struct(dapp_hub: &mut DappHub${keyParams ? ', ' + keyParams : ''}, ${componentName}: ${toPascalCase(componentName)}) {
        ${keyTupleCode}
        let value_tuple = encode_struct(${componentName});
        ${getDappModuleName(projectName)}::set_record(dapp_hub, dapp_key::new(), get_table_id(), key_tuple, value_tuple, OFFCHAIN);
    }` : '';

  // Generate encode and decode functions
  const encodeDecodeFunctions = isSingleValue
    ? `    public fun encode(value: ${Object.values(valueFields)[0] === 'string' || Object.values(valueFields)[0] === 'String' ? 'String' : Object.values(valueFields)[0]}): vector<vector<u8>> {
        let mut value_tuple = vector::empty();
        value_tuple.push_back(${Object.values(valueFields)[0] === 'string' || Object.values(valueFields)[0] === 'String'
          ? `to_bytes(&into_bytes(value))` 
          : Object.values(valueFields)[0] === 'vector<String>'
          ? `to_bytes(&value)`
          : !isBasicType(Object.values(valueFields)[0] as string) 
          ? `${projectName}::${enumTypes.find(e => e.type === Object.values(valueFields)[0])?.module}::encode(value)` 
          : `to_bytes(&value)`});
        value_tuple
    }`
    : includeStruct
    ? `    public fun encode(${valueNames.map(n => `${n}: ${fields[n] === 'string' || fields[n] === 'String' ? 'String' : fields[n]}`).join(', ')}): vector<vector<u8>> {
        let mut value_tuple = vector::empty();
        ${valueNames.map(n => {
          const fieldType = fields[n];
          const isEnum = !isBasicType(fieldType as string);
          const enumType = isEnum ? enumTypes.find(e => e.type === fieldType) : null;
          return `value_tuple.push_back(${fieldType === 'string' || fieldType === 'String' ? `to_bytes(&into_bytes(${n}))` : fieldType === 'vector<String>' ? `to_bytes(&${n})` : isEnum ? `${projectName}::${enumType?.module}::encode(${n})` : `to_bytes(&${n})`});`;
        }).join('\n        ')}
        value_tuple
    }

    public fun encode_struct(${componentName}: ${toPascalCase(componentName)}): vector<vector<u8>> {
        encode(${valueNames.map(n => `${componentName}.${n}`).join(', ')})
    }

    public fun decode(data: vector<u8>): ${toPascalCase(componentName)} {
        let mut bsc_type = sui::bcs::new(data);
        ${valueNames.map(n => {
          const fieldType = fields[n];
          const isEnum = !isBasicType(fieldType as string);
          const enumType = isEnum ? enumTypes.find(e => e.type === fieldType) : null;
          return `let ${n} = ${fieldType === 'string' || fieldType === 'String' ? `string(sui::bcs::peel_vec_u8(&mut bsc_type))` : fieldType === 'vector<String>' ? `dubhe::bcs::peel_vec_string(&mut bsc_type)` : isEnum ? `${projectName}::${enumType?.module}::decode(&mut bsc_type)` : `sui::bcs::peel_${getBcsType(fieldType)}(&mut bsc_type)`};`;
        }).join('\n        ')}
        ${toPascalCase(componentName)} {
            ${valueNames.map(n => `${n},`).join('\n            ')}
        }
    }`
    : '';

  return `${tableIdFunctions}

${registerFunction}

${hasFunctions}

${deleteFunction}

${getterSetters}

${getSetFunctions}

${structFunctions}

${encodeDecodeFunctions}`;
}

function toPascalCase(str: string): string {
  // Split the underscore-separated string into words
  return str
    .split('_')
    .map((word, index) => {
      // If the word is a pure number, return it as is
      if (/^\d+$/.test(word)) {
        return word;
      }
      // Otherwise, capitalize the first letter and lowercase the rest
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
    case 'u8': return 'u8';
    case 'u16': return 'u16';
    case 'u32': return 'u32';
    case 'u64': return 'u64';
    case 'u128': return 'u128';
    case 'u256': return 'u256';
    case 'bool': return 'bool';
    case 'address': return 'address';
    case 'String': return 'string';
    default: return type;
  }
}
