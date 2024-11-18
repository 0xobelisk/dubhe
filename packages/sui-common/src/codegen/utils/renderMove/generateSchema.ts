import { BaseType, SchemaType } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import {
	getStructAttrsWithType,
	getStructAttrs,
	getStructTypes,
	getStructAttrsQuery,
} from './common';

function capitalizeAndRemoveUnderscores(input: string): string {
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

export function renderSetFunc(
	schemaName: string,
	fields: Record<string, string>
): string {
	return `public(package) fun set(self: &mut ${schemaName}, ${getStructAttrsWithType(
		fields
	)}) {
            ${Object.entries(fields)
				.map(([fieldName]) => `self.${fieldName} = ${fieldName};`)
				.join('\n')}
            }`;
}

export function renderGetAllFunc(
	schemaName: string,
	fields: Record<string, string>
): string {
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
			([
				key,
				type,
			]) => `public fun get_${key}(self: &${schemaName}): ${type} {
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
	schemas: Record<string, SchemaType>,
	path: string
) {
	console.log('\n📦 Starting Schema Data Generation...');
	for (const schemaName in schemas) {
		const schema = schemas[schemaName];
		if (schema.data) {
			console.log(`  ├─ Processing schema: ${schemaName}`);
			for (const item of schema.data) {
				console.log(
					`     └─ Generating ${item.name} ${
						Array.isArray(item.fields) ? '(enum)' : '(struct)'
					}`
				);
				let code = '';

				const enumNames = schema.data
					.filter(item => Array.isArray(item.fields))
					.map(item => item.name);

				if (Array.isArray(item.fields)) {
					code = `module ${projectName}::${schemaName}_${convertToSnakeCase(
						item.name
					)} {
                        public enum ${item.name} has copy, drop , store {
                                ${item.fields}
                        }
                        
                        ${item.fields
							.map((field: string) => {
								return `public fun new_${convertToSnakeCase(
									field
								)}(): ${item.name} {
                                ${item.name}::${field}
                            }`;
							})
							.join('')}`;
				} else {
					code = `module ${projectName}::${schemaName}_${convertToSnakeCase(
						item.name
					)} {
                            use std::ascii::String;
                            ${enumNames
								.map(
									name =>
										`use ${projectName}::${schemaName}_${convertToSnakeCase(
											name
										)}::${name};`
								)
								.join('\n')}

                           public struct ${item.name} has copy, drop , store {
                                ${getStructAttrsWithType(item.fields)}
                           }
                        
                           public fun new(${getStructAttrsWithType(
								item.fields
							)}): ${item.name} {
                               ${item.name} {
                                   ${getStructAttrs(item.fields)}
                               }
                            }
                        
                           ${renderGetAllFunc(item.name, item.fields)}
                           ${renderGetAttrsFunc(item.name, item.fields)}
                           ${renderSetAttrsFunc(item.name, item.fields)}
                           ${renderSetFunc(item.name, item.fields)}
                        }`;
				}

				await formatAndWriteMove(
					code,
					`${path}/contracts/${projectName}/sources/codegen/schemas/${schemaName}_${convertToSnakeCase(
						item.name
					)}.move`,
					'formatAndWriteMove'
				);
			}
		}
	}
	console.log('✅ Schema Data Generation Complete\n');
}

function generateImport(
	projectName: string,
	schemaName: string,
	schema: SchemaType
) {
	if (schema.data) {
		return schema.data
			.map(item => {
				return `use ${projectName}::${schemaName}_${convertToSnakeCase(
					item.name
				)}::${item.name};`;
			})
			.join('\n');
	} else {
		return '';
	}
}

export async function generateSchemaStructure(
	projectName: string,
	schemas: Record<string, SchemaType>,
	path: string
) {
	console.log('\n🔨 Starting Schema Structure Generation...');
	for (const schemaName in schemas) {
		console.log(`  ├─ Generating schema: ${schemaName}`);
		console.log(
			`     ├─ Output path: ${path}/contracts/${projectName}/sources/codegen/schemas/${schemaName}.move`
		);
		console.log(
			`     └─ Structure fields: ${
				Object.keys(schemas[schemaName].structure).length
			}`
		);
		const schema = schemas[schemaName];
		const schemaMoudle = `module ${projectName}::${schemaName}_schema {
                    use std::ascii::String;
                    use std::ascii::string;
                    use std::type_name;
                    use dubhe::dapps_system;
                    use dubhe::dapps_schema::Dapps;
                    use dubhe::storage_value::{Self, StorageValue};
                    use dubhe::storage_map::{Self, StorageMap};
                    use dubhe::storage_double_map::{Self, StorageDoubleMap};
                    use ${projectName}::dapp_key::DappKey;
                    use sui::dynamic_field as df;
                    ${generateImport(projectName, schemaName, schema)}

                    public struct ${capitalizeAndRemoveUnderscores(
						schemaName
					)} has key, store {
                        id: UID
											} 
                    
                     ${Object.entries(schema.structure)
							.map(([key, value]) => {
								return `public fun borrow_${key}(self: &${capitalizeAndRemoveUnderscores(
									schemaName
								)}) : &${value} {
                        df::borrow(&self.id, string(b"${key}"))
                    }
                    
                    public(package) fun borrow_mut_${key}(self: &mut ${capitalizeAndRemoveUnderscores(
						schemaName
					)}): &mut ${value} {
                        df::borrow_mut(&mut self.id, string(b"${key}"))
                    }
                    `;
							})
							.join('')} 
                     
           
                    public fun register(dapps: &mut Dapps, ctx: &mut TxContext): ${capitalizeAndRemoveUnderscores(
						schemaName
					)} {
                      let package_id = dapps_system::current_package_id<DappKey>();
                      assert!(dapps.borrow_metadata().contains_key(package_id), 0);
                      assert!(dapps.borrow_admin().get(package_id) == ctx.sender(), 0);
                      let schema = type_name::get<${capitalizeAndRemoveUnderscores(
							schemaName
						)}>().into_string();
                      assert!(!dapps.borrow_schemas().get(package_id).contains(&schema), 0);
                      dapps_system::add_schema<${capitalizeAndRemoveUnderscores(
							schemaName
						)}>(dapps, package_id, ctx);
                      let mut id = object::new(ctx);
                      ${Object.entries(schema.structure)
											.map(([key, value]) => {
												let storage_type = '';
												if (value.includes('StorageValue')) {
													storage_type = `storage_value::new()`;
												} else if (value.includes('StorageMap')) {
													storage_type = `storage_map::new()`;
												} else if (
													value.includes('StorageDoubleMap')
												) {
													storage_type = `storage_double_map::new()`;
												}
												return `
												df::add<String, ${value}>(&mut id, string(b"${key}"), ${storage_type});
												`;
											})
											.join('')}
                      
                      ${capitalizeAndRemoveUnderscores(schemaName)} { id }
                    }
                    
                    
                 // ======================================== View Functions ========================================
                    ${Object.entries(schema.structure)
			.map(([key, value]) => {
				// @ts-ignore
				let all_types = value.match(/<(.+)>/)[1].split(',').map(type => type.trim())
				let para_key: string[] = []
				let para_value = ""
				let borrow_key = ""
				let extra_code = ""
				if (value.includes('StorageValue')) {
					para_key = []
					para_value = `${all_types[0]}`
					borrow_key = 'try_get()'
				} else if (value.includes('StorageMap')) {
					para_key = [`key: ${all_types[0]}`]
					para_value = `${all_types[1]}`
					borrow_key = 'try_get(key)'
					extra_code = `public fun get_${key}_keys(self: &${capitalizeAndRemoveUnderscores(schemaName)}) : vector<${all_types[0]}> {
									self.borrow_${key}().keys()
								}
							
							public fun get_${key}_values(self: &${capitalizeAndRemoveUnderscores(schemaName)}) : vector<${all_types[1]}> {
									self.borrow_${key}().values()
								}`
				} else if (value.includes('StorageDoubleMap')) {
					para_key = [`key1: ${all_types[0]}`, `key2: ${all_types[1]}`]
					para_value = `${all_types[2]}`
					borrow_key = 'try_get(key1, key2)'
					extra_code = `public fun get_${key}_keys(self: &${capitalizeAndRemoveUnderscores(schemaName)}) : (vector<${all_types[0]}>, vector<${all_types[1]}>) {
									self.borrow_${key}().keys()
								}
							
							public fun get_${key}_values(self: &${capitalizeAndRemoveUnderscores(schemaName)}) : vector<${all_types[2]}> {
									self.borrow_${key}().values()
								}`
				}
				return `public fun get_${key}(self: &${capitalizeAndRemoveUnderscores(schemaName)}, ${para_key}) : Option<${para_value}> {
									self.borrow_${key}().${borrow_key}
								}
								` + extra_code;
			})
			.join('')} 
             // =========================================================================================================
                    
               
           }`;
		await formatAndWriteMove(
			schemaMoudle,
			`${path}/contracts/${projectName}/sources/codegen/schemas/${schemaName}.move`,
			'formatAndWriteMove'
		);
	}
	console.log('✅ Schema Structure Generation Complete\n');
}
