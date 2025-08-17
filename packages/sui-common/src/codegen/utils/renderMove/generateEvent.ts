import { EventData, SchemaData } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import { getStructAttrsWithType, getStructAttrs } from './common';

// account_not_found => AccountNotFound,
function toPascalCase(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function convertToSnakeCase(input: string): string {
  return input
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
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
    console.log(`     └─ ${name} event: ${JSON.stringify(fields)}`);

    let code = `module ${projectName}::${projectName}_${name}_event {
						use sui::event;
						use std::ascii::String;
						${generateImport(projectName, data)}

                        public struct ${toPascalCase(name)}Event has copy, drop {
                                ${getStructAttrsWithType(fields as Record<string, string>)}
                        }

                        public fun new(${getStructAttrsWithType(
                          fields as Record<string, string>
                        )}): ${toPascalCase(name)}Event {
                               ${toPascalCase(name)}Event {
                                   ${getStructAttrs(fields as Record<string, string>)}
                               }
                        }
                        }`;
    await formatAndWriteMove(
      code,
      `${path}/src/${projectName}/sources/codegen/data/${name}_event.move`,
      'formatAndWriteMove'
    );
  }

  let code = `module ${projectName}::${projectName}_events {
	 	use std::ascii::{String, string};
	 	${generateImport(projectName, data)}
		${Object.entries(events)
      .map(([name, fields]) => {
        return `
use ${projectName}::${projectName}_${name}_event::${toPascalCase(name)}Event;
use ${projectName}::${projectName}_${name}_event;
			public fun ${name}_event(${getStructAttrsWithType(fields as Record<string, string>)}) {
			 dubhe::storage_event::emit_set_record<${toPascalCase(name)}Event, ${toPascalCase(
          name
        )}Event, ${toPascalCase(name)}Event>(
				string(b"${name}_event"),
				option::none(),
			  	option::none(),
			  option::some(${projectName}_${name}_event::new(${getStructAttrs(
          fields as Record<string, string>
        )}))
			  )
			}
		`;
      })
      .join('\n')}		
            }`;

  await formatAndWriteMove(
    code,
    `${path}/src/${projectName}/sources/codegen/events.move`,
    'formatAndWriteMove'
  );
}
