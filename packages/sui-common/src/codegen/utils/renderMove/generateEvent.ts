import {BaseType, EventData, SchemaData, SchemaType} from '../../types';
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

function convertToSnakeCase(input: string): string {
	return input
		.replace(/([A-Z])/g, '_$1')
		.toLowerCase()
		.replace(/^_/, '');
}

function generateImport(
	projectName: string,
	data: Record<string, SchemaData> | null,
) {
	if (data != null) {
		const names = Object.keys(data);
		return names
			.map(name => {
				return `use ${projectName}::${convertToSnakeCase(
					name,
				)}::${name};`;
			})
			.join('\n');
	} else {
		return '';
	}
}

export async function generateSchemaEvent(
	projectName: string,
	data: Record<string, SchemaData> | null,
	events: Record<string, EventData>,
	path: string
) {
	console.log('\n📦 Starting Schema Event Generation...');
	for (const key of Object.keys(events)) {
				const name = key;
				const fields = events[key];
				console.log(
					`     └─ Generating ${name} event: ${fields}`
				);

				let	code = `module ${projectName}::${convertToSnakeCase(name)}_event {
						use sui::event;
						use std::ascii::String;
						${generateImport(projectName, data)}

                        public struct ${name}Event has copy, drop {
                                ${getStructAttrsWithType(fields as Record<string, string>)}
                        }

                        public fun new(${getStructAttrsWithType(fields as Record<string, string>)}): ${name}Event {
                               ${name}Event {
                                   ${getStructAttrs(fields as Record<string, string>)}
                               }
                        }
                        }`;
				await formatAndWriteMove(
					code,
					`${path}/contracts/${projectName}/sources/codegen/data/${convertToSnakeCase(
						name
					)}_event.move`,
					'formatAndWriteMove'
				);
			}

	let	code = `module ${projectName}::events {
	 	use std::ascii::{String, string};
	 	${generateImport(projectName, data)}
		${Object.entries(events).map(([name, fields]) => {
		return `
use ${projectName}::${convertToSnakeCase(name)}_event::${name}Event;
use ${projectName}::${convertToSnakeCase(name)}_event;
			public fun ${convertToSnakeCase(name)}_event(${getStructAttrsWithType(fields as Record<string, string>)}) {
			 dubhe::storage_event::emit_set_record<${name}Event, ${name}Event, ${name}Event>(
				string(b"${convertToSnakeCase(name)}_event"),
				option::none(),
			  	option::none(),
			  option::some(${convertToSnakeCase(name)}_event::new(${getStructAttrs(fields as Record<string, string>)}))
			  )
			}
		`
	}).join('\n')}		
            }`


	await formatAndWriteMove(
		code,
		`${path}/contracts/${projectName}/sources/codegen/events.move`,
		'formatAndWriteMove'
	);
	console.log('✅ Schema Event Generation Complete\n');
}