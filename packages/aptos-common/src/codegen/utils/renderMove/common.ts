import { BaseType, SchemaMapType, BaseValueType, MoveType, ValueType } from '../../types';
import fs from 'fs';

export function deleteFolderRecursive(path: string) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach((file) => {
      const curPath = `${path}/${file}`;
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

export function capitalizeFirstLetter(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

/**
 * Convert snake_case to camelCase
 * @param str
 */
export function convertToCamelCase(str: string): string {
  str = str.charAt(0).toUpperCase() + str.slice(1);
  const result = str.replace(/(_\w)/g, (match) => match[1].toUpperCase());
  return result + 'Data';
}

/**
 *
 * @param name
 * @param values
 * @return [use name::name_schema, use name::info_schema]
 */
export function getUseSchema(name: string, values: Record<string, SchemaMapType>): string[] {
  const schema: string[] = [];
  Object.entries(values).forEach(([key, value]) => {
    if (typeof value === 'object' && value.ephemeral) {
    } else {
      schema.push(`\tuse ${name}::${key}_schema;`);
    }
  });
  return schema;
}

/**
 * @param values
 * @return [ name_schema::register(&mut _dubhe_world, ctx) ,info_schema::register(&mut _dubhe_world, ctx) ]
 */
export function getRegisterSchema(values: Record<string, SchemaMapType>): string[] {
  const registers: string[] = [];
  Object.entries(values).forEach(([key, value]) => {
    if (typeof value === 'object' && value.ephemeral) {
    } else {
      registers.push(`\t\t${key}_schema::register(deployer);`);
    }
  });
  return registers;
}

/**
 *
 * @param name
 * @param values
 * @return [ friend name::name_system, friend name::info_system ]
 */
export function getFriendSystem(name: string, values: string[]): string {
  return (
    values.map((key) => `\tfriend ${name}::${key};`).join('\n') + `\n\tfriend ${name}::deploy_hook;`
  );
}

export function getFriendSchema(name: string, schemas: Record<string, SchemaMapType>): string {
  const schemaNames = Object.keys(schemas).filter(
    (key) =>
      !(
        typeof schemas === 'object' &&
        'ephemeral' in schemas &&
        (schemas[key] as ValueType).ephemeral
      )
  );
  return (
    schemaNames.map((key) => `\tfriend ${name}::${key}_schema;`).join('\n') +
    `\n\tfriend ${name}::deploy_hook;`
  );
}

/**
 *
 * @param values
 * @param prefixArgs
 * @return [ name, age, birth_time ]
 */
export function getStructAttrs(
  values: Record<string, string> | string,
  prefixArgs: string
): string[] {
  return typeof values === 'string'
    ? [`${prefixArgs}value`]
    : Object.entries(values).map(([key, _]) => `${prefixArgs}${key}`);
}

export function getDestStructAttrs(
  dest: string,
  values: Record<string, string> | string,
  prefixArgs: string,
  isSingle: boolean
): string[] {
  return typeof values === 'string'
    ? [`${prefixArgs}value`]
    : Object.entries(values).map(([key, _]) =>
        key === dest
          ? `${prefixArgs}${key}`
          : isSingle
          ? `${prefixArgs}${key}: _dubhe_schema.${key}`
          : `${prefixArgs}${key}: _dubhe_data.${key}`
      );
}

function isAddress(str: string): boolean {
  const regex = /^0x[a-fA-F0-9]+$/;
  return regex.test(str);
}

export function getStructInitValue(
  keys: BaseType | Record<string, BaseType>,
  values: BaseValueType | Record<string, BaseValueType>
) {
  if (typeof values === 'string' || typeof values === 'boolean' || typeof values === 'number') {
    if (keys === 'string') {
      return [`string::utf8(b"${values}")`];
    }
    if (typeof values === 'string') {
      if (isAddress(values)) {
        return [`@${values}`];
      }
    }
    return [`${values}`];
  } else if (Array.isArray(values)) {
    // Check the array element type
    if (values.length > 0) {
      if (
        typeof values[0] === 'string' ||
        typeof values[0] === 'boolean' ||
        typeof values[0] === 'number'
      ) {
        if (keys === 'vector<string>') {
          return [`vector[${values.map((item) => `string::utf8(b"${item}")`)}]`];
        }

        if (typeof values[0] === 'string') {
          if (isAddress(values[0])) {
            return [`vector[${values.map((item) => `@${item}`)}]`];
          }
        }
        return [`vector[${values.map((item) => `${item}`)}]`];
      } else if (typeof values === 'object') {
        const res = `vector[${values.map((item: any) => {
          return `vector[${item.map((data: any) => {
            return `${data}`;
          })}]`;
        })}]`;

        return [res];
      }
    } else {
      if (keys === 'vector<string>') {
        return 'vector[string::utf8(b"")]';
      }
      return 'vector[]';
    }
  } else if (typeof values === 'object') {
    // It's an object, handle accordingly
    const res = Object.entries(values).map(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
        if (typeof keys === 'string') {
          if (keys === 'string') {
            return `string::utf8(b"${value}")`;
          }
        } else {
          if (keys[key] === 'string') {
            return `string::utf8(b"${value}")`;
          }
        }

        if (typeof value === 'string') {
          if (isAddress(value)) {
            return `@${value}`;
          }
        }
        return `${value}`;
      } else if (Array.isArray(value)) {
        // Check the array element type
        if (value.length > 0) {
          if (
            typeof value[0] === 'string' ||
            typeof value[0] === 'boolean' ||
            typeof value[0] === 'number'
          ) {
            if (typeof keys === 'string') {
              if (keys === 'vector<string>') {
                return `vector[${value.map((item) => `string::utf8(b"${item}")`)}]`;
              }
            } else {
              if (keys[key] === 'vector<string>') {
                return `vector[${value.map((item) => `string::utf8(b"${item}")`)}]`;
              }
            }

            if (typeof value[0] === 'string') {
              if (isAddress(value[0])) {
                return `vector[${value.map((item) => `@${item}`)}]`;
              }
            }
            return `vector[${value.map((item) => `${item}`)}]`;
          } else if (typeof value === 'object') {
            const res = `vector[${value.map((item: any) => {
              return `vector[${item.map((data: any) => {
                return `${data}`;
              })}]`;
            })}]`;

            return res;
          }
        } else {
          if (typeof keys !== 'string') {
            if (keys[key] === 'vector<string>') {
              return 'vector[string::utf8(b"")]';
            }
            return 'vector[]';
          }
        }
      }
    });
    return res;
  }
  // Handle other cases or return an empty array if type not recognized
  return [];
}

/**
 *
 * @param values
 * @return ( bool , u64 , u64)
 */
// export function getStructTypes(values: SchemaMapType): string {
export function getStructTypes(values: MoveType | Record<string, MoveType>): string {
  return typeof values === 'string'
    ? values
    : `(${Object.entries(values).map(([_, type]) => `${type}`)})`;
}

/**
 *
 * @param values
 * @return Attributes and types of the struct. [ name: string, age: u64 ]
 */
export function getStructAttrsWithType(
  values: Record<string, string> | string,
  prefix: string
): string[] {
  return typeof values === 'string'
    ? [`${prefix}value: ${values}`]
    : Object.entries(values).map(([key, type]) => `${prefix}${key}: ${type}`);
}

/**
 * @param values
 * @param prefixArgs
 * @return [ data.name, data.age ]
 */
export function getStructAttrsQuery(
  values: MoveType | Record<string, MoveType>,
  prefixArgs: string
): string[] {
  return typeof values === 'string'
    ? [`${prefixArgs}_dubhe_data.value`]
    : Object.entries(values).map(([key, _]) => `${prefixArgs}_dubhe_data.${key}`);
}

export function renderKeyName(values: Record<string, string> | string): string {
  return `\t${getStructAttrs(values, '// ').join('\n\t')}`;
}

export function renderStruct(
  structName: string,
  values: Record<string, string> | string,
  isEphemeral: boolean = false
): string {
  return `\tstruct ${structName} has store ${isEphemeral ? ', drop' : ''} {
${getStructAttrsWithType(values, '\t\t').join(',\n')}
\t}\n`;
}

export function renderSingleStruct(
  structName: string,
  values: Record<string, string> | string
): string {
  return `\tstruct ${structName} has key {
${getStructAttrsWithType(values, '\t\t').join(',\n')}
\t}\n`;
}

export function renderStructEvent(
  structName: string,
  values: Record<string, string> | string
): string {
  return `\tstruct ${structName}Event has drop, store {
${getStructAttrsWithType(values, '\t\t').join(',\n')}
\t}\n`;
}

export function renderNewStructFunc(
  structName: string,
  values: Record<string, string> | string
): string {
  return `\tpublic fun new(${getStructAttrsWithType(values, '').join(', ')}): ${structName} {
\t\t${structName} {
${getStructAttrs(values, '\t\t\t').join(', \n')}
\t\t}
\t}\n`;
}

export function renderRegisterFunc(): string {
  return `\tpublic fun register(deployer: &signer) {
\t\tassert!(address_of(deployer) == world::deployer_address(), 0);
\t\tlet _dubhe_schema = SchemaData { value: table::new() };
\t\tlet resource_signer = world::resource_signer();
\t\tmove_to(&resource_signer, _dubhe_schema)
\t}`;
}

export function renderSetFunc(structName: string, values: Record<string, string> | string): string {
  return `\tpublic(friend) fun set(_dubhe_entity_key: address, ${getStructAttrsWithType(
    values,
    ' '
  )}) acquires SchemaData {
\t\tlet _dubhe_resource_address = world::resource_address();
\t\tlet _dubhe_schema = borrow_global_mut<SchemaData>(_dubhe_resource_address);
\t\tif(table::contains<address, ${structName}>(&_dubhe_schema.value, _dubhe_entity_key)) {
\t\t\tlet _dubhe_data = table::borrow_mut<address, ${structName}>(&mut _dubhe_schema.value, _dubhe_entity_key);
${
  typeof values === 'string'
    ? `\t\t\t_dubhe_data.value = value;`
    : Object.entries(values)
        .map(([key, _]) => `\t\t\t_dubhe_data.${key} = ${key};`)
        .join('\n')
}
\t\t} else {
\t\t\ttable::add(&mut _dubhe_schema.value, _dubhe_entity_key, new(${getStructAttrs(values, ' ')}));
\t\t};
\t\tevents::emit_set(schema_id(), schema_type(), some(_dubhe_entity_key), ${structName}Event{ ${getStructAttrs(
    values,
    ' '
  )} });
\t}
`;
}

export function renderRemoveFunc(
  structName: string,
  values: Record<string, string> | string
): string {
  return `\tpublic(friend) fun remove(_dubhe_entity_key: address) acquires SchemaData {
\t\tlet _dubhe_resource_address = world::resource_address();
\t\tlet _dubhe_schema = borrow_global_mut<SchemaData>(_dubhe_resource_address);
\t\tlet _dubhe_data = table::remove(&mut _dubhe_schema.value, _dubhe_entity_key);
\t\tevents::emit_remove(schema_id(), _dubhe_entity_key);
\t\tlet ${structName} { ${
    typeof values === 'string'
      ? `value: _value`
      : Object.entries(values).map(([key, _]) => `${key}: _${key}`)
  } } = _dubhe_data;
\t}
`;
}

export function renderSetAttrsFunc(
  structName: string,
  struct: MoveType | Record<string, MoveType>
): string {
  return typeof struct === 'string'
    ? ''
    : '\n' +
        Object.entries(struct)
          .map(
            ([key, type]) =>
              `\tpublic(friend) fun set_${key}(_dubhe_entity_key: address, ${key}: ${type}) acquires SchemaData {
\t\tlet _dubhe_resource_address = world::resource_address();
\t\tlet _dubhe_schema = borrow_global_mut<SchemaData>(_dubhe_resource_address);
\t\tlet _dubhe_data = table::borrow_mut<address, ${structName}>(&mut _dubhe_schema.value, _dubhe_entity_key);
\t\t_dubhe_data.${key} = ${key};
\t\tevents::emit_set(schema_id(), schema_type(), some(_dubhe_entity_key), ${structName}Event{ ${getDestStructAttrs(
                key,
                struct,
                ' ',
                false
              )} });
\t}
`
          )
          .join('\n');
}

export function renderGetAllFunc(
  structName: string,
  struct: MoveType | Record<string, MoveType>
): string {
  return `\t#[view]
\tpublic fun get(_dubhe_entity_key: address): ${getStructTypes(struct)} acquires SchemaData {
\t\tlet _dubhe_resource_address = world::resource_address();
\t\tlet _dubhe_schema = borrow_global<SchemaData>(_dubhe_resource_address);
\t\tlet _dubhe_data = table::borrow<address, ${structName}>(&_dubhe_schema.value, _dubhe_entity_key);
\t\t(
${getStructAttrsQuery(struct, '\t\t\t').join(',\n')}
\t\t)
\t}
`;
}

export function renderGetAttrsFunc(
  structName: string,
  struct: MoveType | Record<string, MoveType>
): string {
  return typeof struct === 'string'
    ? ''
    : '\n' +
        Object.entries(struct)
          .map(
            ([key, type]) => `\t#[view]
\tpublic fun get_${key}(_dubhe_entity_key: address): ${type} acquires SchemaData {
\t\tlet _dubhe_resource_address = world::resource_address();
\t\tlet _dubhe_schema = borrow_global<SchemaData>(_dubhe_resource_address);
\t\tlet _dubhe_data = table::borrow<address, ${structName}>(&_dubhe_schema.value, _dubhe_entity_key);
\t\t_dubhe_data.${key}
\t}
`
          )
          .join('\n');
}

export function renderContainFunc(structName: string): string {
  return `\t#[view]
\tpublic fun contains(_dubhe_entity_key: address): bool acquires SchemaData {
\t\tlet _dubhe_resource_address = world::resource_address();
\t\tlet _dubhe_schema = borrow_global<SchemaData>(_dubhe_resource_address);
\t\ttable::contains<address, ${structName}>(&_dubhe_schema.value, _dubhe_entity_key)
\t}`;
}

export function renderRegisterFuncWithInit(
  structName: string,
  valueType: BaseType | Record<string, BaseType>,
  defaultValue: BaseValueType | Record<string, BaseValueType>
): string {
  return `\tpublic fun register(deployer: &signer) {
\t\tassert!(address_of(deployer) == world::deployer_address(), 0);
\t\tlet _dubhe_schema = new(${getStructInitValue(valueType, defaultValue)});
\t\tlet resource_signer = world::resource_signer();
\t\tmove_to(&resource_signer, _dubhe_schema)
\t}`;
}

export function renderSingleSetFunc(
  structName: string,
  values: Record<string, string> | string
): string {
  return `\tpublic(friend) fun set(${getStructAttrsWithType(values, ' ')}) acquires ${structName} {
\t\tlet _dubhe_resource_address = world::resource_address();
\t\tlet _dubhe_schema = borrow_global_mut<${structName}>(_dubhe_resource_address);
${
  typeof values === 'string'
    ? `\t\t_dubhe_schema.value = value;`
    : Object.entries(values)
        .map(([key, _]) => `\t\t_dubhe_schema.${key} = ${key};`)
        .join('\n')
}
\t\tevents::emit_set(schema_id(), schema_type(), none(), ${structName}Event { ${getStructAttrs(
    values,
    ' '
  )} });
\t}`;
}

export function renderSingleSetAttrsFunc(
  structName: string,
  struct: MoveType | Record<string, MoveType>
): string {
  return typeof struct === 'string'
    ? ''
    : '\n' +
        Object.entries(struct)
          .map(
            ([key, type]) => `
\tpublic(friend) fun set_${key}(${key}: ${type}) acquires ${structName} {
\t\tlet _dubhe_resource_address = world::resource_address();
\t\tlet _dubhe_schema = borrow_global_mut<${structName}>(_dubhe_resource_address);
\t\t_dubhe_schema.${key} = ${key};
\t\tevents::emit_set(schema_id(), schema_type(), none(), ${structName}Event { ${getDestStructAttrs(
              key,
              struct,
              ' ',
              true
            )} });
\t}`
          )
          .join('\n');
}

export function renderSingleGetAllFunc(
  structName: string,
  values: MoveType | Record<string, MoveType>
): string {
  return `\t#[view]
\tpublic fun get(): ${getStructTypes(values)} acquires ${structName} {
\t\tlet _dubhe_resource_address = world::resource_address();
\t\tlet _dubhe_schema = borrow_global<${structName}>(_dubhe_resource_address);
\t\t(
${
  typeof values === 'string'
    ? `\t\t\t_dubhe_schema.value`
    : Object.entries(values)
        .map(([key, _]) => `\t\t\t_dubhe_schema.${key},`)
        .join('\n')
}
\t\t)
\t}`;
}

export function renderSingleGetAttrsFunc(
  structName: string,
  struct: MoveType | Record<string, MoveType>
): string {
  return typeof struct === 'string'
    ? ''
    : '\n' +
        Object.entries(struct)
          .map(
            ([key, type]) => `
\t#[view]
\tpublic fun get_${key}(): ${type} acquires ${structName} {
\t\tlet _dubhe_resource_address = world::resource_address();
\t\tlet _dubhe_schema = borrow_global<${structName}>(_dubhe_resource_address);
\t\t_dubhe_schema.${key}
\t}`
          )
          .join('\n');
}
