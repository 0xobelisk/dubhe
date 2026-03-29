import { DubheConfig, BaseValueType, BaseType, RenderSchemaOptions, MoveType } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import {
  getFriendSystem,
  renderKeyName,
  renderSetFunc,
  renderContainFunc,
  renderRemoveFunc,
  renderStruct,
  renderNewStructFunc,
  convertToCamelCase,
  renderSetAttrsFunc,
  renderRegisterFunc,
  renderGetAllFunc,
  renderGetAttrsFunc,
  getStructAttrsWithType,
  getStructAttrs,
  renderRegisterFuncWithInit,
  renderSingleSetFunc,
  renderSingleSetAttrsFunc,
  renderSingleGetAllFunc,
  renderSingleGetAttrsFunc,
  renderStructEvent,
  renderSingleStruct
} from './common';

export function getRenderSchemaOptions(config: DubheConfig) {
  const options: RenderSchemaOptions[] = [];
  for (const schemaName of Object.keys(config.schemas)) {
    const schemaData = config.schemas[schemaName];
    let valueType: MoveType | Record<string, MoveType>;
    let realType: BaseType | Record<string, BaseType>;
    let defaultValue: BaseValueType | Record<string, BaseValueType> | undefined;
    let ephemeral = false;
    let singleton = false;
    let needImportString = false;
    if (typeof schemaData === 'string') {
      realType = schemaData;

      if (schemaData === 'string') {
        valueType = 'String';
        needImportString = true;
      } else if (schemaData === 'vector<string>') {
        valueType = 'vector<String>';
        needImportString = true;
      } else {
        valueType = schemaData;
      }
    } else {
      realType = schemaData.valueType;

      if (typeof schemaData.valueType === 'string') {
        if (schemaData.valueType === 'string') {
          valueType = 'String';
          needImportString = true;
        } else if (schemaData.valueType === 'vector<string>') {
          valueType = 'vector<String>';
          needImportString = true;
        } else {
          valueType = schemaData.valueType;
        }
      } else {
        valueType = { ...schemaData.valueType };
        for (const key in valueType) {
          if (valueType.hasOwnProperty(key)) {
            if (valueType[key] === 'string') {
              valueType[key] = 'String';
              needImportString = true;
            } else if (valueType[key] === 'vector<string>') {
              valueType[key] = 'vector<String>';
              needImportString = true;

              // needImport = "\tuse std::ascii::{String, string};";
            }
          }
        }
      }
      defaultValue = schemaData.defaultValue;
      ephemeral = schemaData.ephemeral !== undefined ? schemaData.ephemeral : false;
      singleton = schemaData.defaultValue !== undefined ? true : false;
    }

    options.push({
      projectName: config.name,
      systems: config.systems,
      schemaName: schemaName,
      structName: convertToCamelCase(schemaName),
      ephemeral,
      singleton,
      valueType,
      realType,
      // structAttrs: [renderKeyName(valueType)],
      // structTypes: [renderStruct(convertToCamelCase(schemaName), valueType)],
      defaultValue,
      needImportString
    });
  }
  return options;
}

export function generateSchema(config: DubheConfig, srcPrefix: string) {
  const options = getRenderSchemaOptions(config);
  for (const option of options) {
    let code: string;
    if (option.ephemeral) {
      code = renderEphemeralSchema(option);
    } else if (option.defaultValue !== undefined) {
      code = renderSingleSchema(option);
    } else {
      code = renderSchema(option);
    }
    formatAndWriteMove(
      code,
      `${srcPrefix}/contracts/${option.projectName}/sources/codegen/schemas/${option.schemaName}.move`,
      'formatAndWriteMove'
    );
  }
}

function renderEphemeralSchema(option: RenderSchemaOptions): string {
  return `module ${option.projectName}::${option.schemaName}_schema {
${option.needImportString ? '\tuse std::string::String;\n\t' : '\t'}use std::option::none;
    use ${option.projectName}::events;
    
${renderKeyName(option.valueType)}
${renderStruct(option.structName, option.valueType, option.ephemeral)} 
${renderNewStructFunc(option.structName, option.valueType)} 
\tpublic fun emit_${option.schemaName}(${getStructAttrsWithType(option.valueType, ' ')}) {
\t\tevents::emit_set(schema_id(), schema_type(), none(), new(${getStructAttrs(
    option.valueType,
    ' '
  )}))
\t}

\t#[view]
\tpublic fun schema_id(): vector<u8> {
\t\tb"${option.schemaName}"
\t}

\t#[view]
\tpublic fun schema_type(): u8 {
\t\t2
\t}
}`;
}

function renderSingleSchema(option: RenderSchemaOptions): string {
  return `module ${option.projectName}::${option.schemaName}_schema {
${option.needImportString ? '\tuse std::string::{Self, String};\n\t' : '\t'}use std::option::none;
    use std::signer::address_of;
    use ${option.projectName}::events;
    use ${option.projectName}::world;
    
    // Systems
${getFriendSystem(option.projectName, option.systems)}

${renderKeyName(option.valueType)}
${renderSingleStruct(option.structName, option.valueType)}
${renderStructEvent(option.structName, option.valueType)}
${renderNewStructFunc(option.structName, option.valueType)}
${renderRegisterFuncWithInit(option.structName, option.realType, option.defaultValue!)}

${renderSingleSetFunc(option.structName, option.valueType)}${renderSingleSetAttrsFunc(
    option.structName,
    option.valueType
  )}

${renderSingleGetAllFunc(option.structName, option.valueType)}${renderSingleGetAttrsFunc(
    option.structName,
    option.valueType
  )}

\t#[view]
\tpublic fun schema_id(): vector<u8> {
\t\tb"${option.schemaName}"
\t}

\t#[view]
\tpublic fun schema_type(): u8 {
\t\t1
\t}

}
`;
}

function renderSchema(option: RenderSchemaOptions) {
  return `module ${option.projectName}::${option.schemaName}_schema {
${option.needImportString ? '\tuse std::string::String;\n\t' : '\t'}use std::option::some;
    use std::signer::address_of;
    use aptos_std::table::{Self, Table};
    use ${option.projectName}::events;
    use ${option.projectName}::world;

    // Systems
${getFriendSystem(option.projectName, option.systems)}

${renderKeyName(option.valueType)}
${renderStruct(option.structName, option.valueType)}
${renderNewStructFunc(option.structName, option.valueType)}
${renderStructEvent(option.structName, option.valueType)}
\tstruct SchemaData has key {
\t\tvalue: Table<address, ${option.structName}>
\t}

${renderRegisterFunc()}

${renderSetFunc(option.structName, option.valueType)}${renderSetAttrsFunc(
    option.structName,
    option.valueType
  )}
${renderRemoveFunc(option.structName, option.valueType)}
${renderGetAllFunc(option.structName, option.valueType)}${renderGetAttrsFunc(
    option.structName,
    option.valueType
  )}
${renderContainFunc(option.structName)}

\t#[view]
\tpublic fun schema_id(): vector<u8> {
\t\tb"${option.schemaName}"
\t}

\t#[view]
\tpublic fun schema_type(): u8 {
\t\t0
\t}
}
`;
}
