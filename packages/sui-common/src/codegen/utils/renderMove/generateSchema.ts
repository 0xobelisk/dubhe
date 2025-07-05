import { BaseType, SchemaData, SchemaType } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import {
  getStructAttrsWithType,
  getStructAttrs,
  getStructTypes,
  getStructAttrsQuery,
  containsString
} from './common';

function sortByFirstLetter(arr: string[]): string[] {
  return arr.sort((a, b) => {
    const firstLetterA = a.charAt(0).toLowerCase();
    const firstLetterB = b.charAt(0).toLowerCase();

    if (firstLetterA < firstLetterB) {
      return -1;
    }
    if (firstLetterA > firstLetterB) {
      return 1;
    }
    return 0;
  });
}

export function capitalizeAndRemoveUnderscores(input: string): string {
  return input
    .split('_')
    .map((word, index) => {
      return index === 0
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

export function renderSetAttrsFunc(
  schemaName: string,
  fields: BaseType | Record<string, BaseType>
): string {
  return Object.entries(fields)
    .map(
      ([key, type]) =>
        `public(package) fun set_${key}(self: &mut ${schemaName}, ${key}: ${type}) {
                        self.${key} = ${key};
                    }`
    )
    .join('\n');
}

export function renderSetFunc(schemaName: string, fields: Record<string, string>): string {
  return `public(package) fun set(self: &mut ${schemaName}, ${getStructAttrsWithType(fields)}) {
            ${Object.entries(fields)
              .map(([fieldName]) => `self.${fieldName} = ${fieldName};`)
              .join('\n')}
            }`;
}

export function renderGetAllFunc(schemaName: string, fields: Record<string, string>): string {
  return `public fun get(self: &${schemaName}): ${getStructTypes(fields)} {
        (${getStructAttrsQuery(fields)})
    }`;
}

export function renderGetAttrsFunc(
  schemaName: string,
  fields: BaseType | Record<string, BaseType>
): string {
  return Object.entries(fields)
    .map(
      ([key, type]) => `public fun get_${key}(self: &${schemaName}): ${type} {
                                    self.${key}
                                }`
    )
    .join('\n');
}

function convertToSnakeCase(input: string): string {
  return input
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

export async function generateSchemaData(
  projectName: string,
  data: Record<string, SchemaData>,
  path: string
) {
  console.log('\n📦 Starting Schema Data Generation...');
  for (const key of Object.keys(data)) {
    const name = key;
    const fields = data[key];
    console.log(
      `     └─ ${name} ${Array.isArray(fields) ? '(enum)' : '(struct)'}: ${JSON.stringify(fields)}`
    );
    let code = '';

    const enumNames = Object.keys(data)
      .filter((item) => Array.isArray(data[item]))
      .map((item) => item);

    if (Array.isArray(fields)) {
      const sortByFirstLetterFields = sortByFirstLetter(fields);
      code = `module ${projectName}::${projectName}_${convertToSnakeCase(name)} {
                        public enum ${name} has copy, drop , store {
                                ${sortByFirstLetterFields}
                        }
                        
                        ${sortByFirstLetterFields
                          .map((field: string) => {
                            return `public fun new_${convertToSnakeCase(field)}(): ${name} {
                                ${name}::${field}
                            }`;
                          })
                          .join('')}`;
    } else {
      code = `module ${projectName}::${projectName}_${convertToSnakeCase(name)} {
                            use std::ascii::String;
    
						${Object.keys(data)
              .map((name) => {
                if (containsString(fields, name)) {
                  return `use ${projectName}::${projectName}_${convertToSnakeCase(name)}::${name};`;
                }
                return undefined;
              })
              .filter(Boolean)
              .join('\n')}

                           public struct ${name} has copy, drop , store {
                                ${getStructAttrsWithType(fields)}
                           }
                        
                           public fun new(${getStructAttrsWithType(fields)}): ${name} {
                               ${name} {
                                   ${getStructAttrs(fields)}
                               }
                            }
                        
                           ${renderGetAllFunc(name, fields)}
                           ${renderGetAttrsFunc(name, fields)}
                           ${renderSetAttrsFunc(name, fields)}
                           ${renderSetFunc(name, fields)}
                        }`;
    }

    await formatAndWriteMove(
      code,
      `${path}/src/${projectName}/sources/codegen/data/${convertToSnakeCase(name)}.move`,
      'formatAndWriteMove'
    );
  }
}

function generateImport(projectName: string, data: Record<string, SchemaData> | null) {
  if (data != null) {
    const names = Object.keys(data);
    return names
      .map((name) => {
        return `use ${projectName}::${projectName}_${convertToSnakeCase(name)}::${name};`;
      })
      .join('\n');
  } else {
    return '';
  }
}

export async function generateSchemaStructure(
  projectName: string,
  data: Record<string, SchemaData> | null,
  schemas: Record<string, SchemaType>,
  path: string
) {
  console.log('\n📦 Starting Schema Structure Generation...');
  Object.entries(schemas).forEach(([key, value]) => {
    console.log(`     └─ ${key}: ${value}`);
  });
  const schemaMoudle = `module ${projectName}::${projectName}_schema {
                    use std::ascii::String;
                    use std::ascii::string;
                    use sui::package::UpgradeCap;
                    use std::type_name; 
                    use dubhe::storage;
                    use dubhe::${projectName == 'dubhe' ? 'storage_value_internal' : 'storage_value'}::{Self, StorageValue};
                    use dubhe::${projectName == 'dubhe' ? 'storage_map_internal' : 'storage_map'}::{Self, StorageMap};
                    use dubhe::${projectName == 'dubhe' ? 'storage_double_map_internal' : 'storage_double_map'}::{Self, StorageDoubleMap};
                    use sui::dynamic_field as df;
                
                    ${generateImport(projectName, data)}

                    public struct Schema has key, store { id: UID } 
                    
                     ${Object.entries(schemas)
                       .map(([key, value]) => {
                         return `public fun borrow_${key}(self: &Schema) : &${value} {
                        storage::borrow_field(&self.id, b"${key}")
                    }
                    
                    public(package) fun ${key}(self: &mut Schema): &mut ${value} {
                        storage::borrow_mut_field(&mut self.id, b"${key}")
                    }
                    `;
                       })
                       .join('')} 
                     
           
                    public(package) fun create(ctx: &mut TxContext): Schema {
                      let mut id = object::new(ctx);
                      ${Object.entries(schemas)
                        .map(([key, value]) => {
                          let storage_type = '';
                          if (value.includes('StorageValue')) {
                            storage_type = `${projectName == 'dubhe' ? 'storage_value_internal' : 'storage_value'}::new(b"${key}", ctx)`;
                          } else if (value.includes('StorageMap')) {
                            storage_type = `${projectName == 'dubhe' ? 'storage_map_internal' : 'storage_map'}::new(b"${key}", ctx)`;
                          } else if (value.includes('StorageDoubleMap')) {
                            storage_type = `${projectName == 'dubhe' ? 'storage_double_map_internal' : 'storage_double_map'}::new(b"${key}", ctx)`;
                          }
                          return `storage::add_field<${value}>(&mut id, b"${key}", ${storage_type});`;
                        })
                        .join('\n')}
                      
                      Schema { id }
                    }
                    
                    public(package) fun id(self: &mut Schema): &mut UID {
					  &mut self.id
					}
				
					public(package) fun borrow_id(self: &Schema): &UID {
					  &self.id
					}
                    
          public fun migrate(_schema: &mut Schema, _ctx: &mut TxContext) {  }
              
                 // ======================================== View Functions ========================================
                    ${Object.entries(schemas)
                      .map(([key, value]) => {
                        // @ts-ignore
                        let all_types = value
                          .match(/<(.+)>/)[1]
                          .split(',')
                          .map((type) => type.trim());
                        let para_key: string[] = [];
                        let para_value = '';
                        let borrow_key = '';
                        if (value.includes('StorageValue')) {
                          para_key = [];
                          para_value = `${all_types[0]}`;
                          borrow_key = 'get()';
                        } else if (value.includes('StorageMap')) {
                          para_key = [`key: ${all_types[0]}`];
                          para_value = `${all_types[1]}`;
                          borrow_key = 'get(key)';
                        } else if (value.includes('StorageDoubleMap')) {
                          para_key = [`key1: ${all_types[0]}`, `key2: ${all_types[1]}`];
                          para_value = `${all_types[2]}`;
                          borrow_key = 'get(key1, key2)';
                        }
                        return `public fun get_${key}(self: &Schema, ${para_key}) : &${para_value} {
									self.borrow_${key}().${borrow_key}
								}`;
                      })
                      .join('\n')}
             // =========================================================================================================
			}`;
  await formatAndWriteMove(
    schemaMoudle,

    `${path}/src/${projectName}/sources/codegen/core/schema.move`,
    'formatAndWriteMove'
  );
}
