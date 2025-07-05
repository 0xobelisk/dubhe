import { Plugin } from 'postgraphile';

// All fields filter plugin - ensure all fields support filtering
export const AllFieldsFilterPlugin: Plugin = (builder) => {
  // Extend filter input type, add filter support for all fields
  builder.hook('GraphQLInputObjectType:fields', (fields, build, context) => {
    const {
      scope: { isPgConnectionFilter, pgIntrospection: table }
    } = context;

    // Only handle connection filters
    if (!isPgConnectionFilter || !table || table.kind !== 'class') {
      return fields;
    }

    const enhancedFields = { ...fields };

    // Add filters for each field of the table
    table.attributes.forEach((attr: any) => {
      const fieldName = build.inflection.column(attr);

      // Skip fields that already exist
      if (enhancedFields[fieldName]) {
        return;
      }

      // Determine filter type based on field type
      let filterType;
      const pgType = attr.type;

      // Special handling for BigInt type
      if (pgType.name === 'int8' || pgType.name === 'bigint') {
        // For BigInt type, try to use StringFilter (because BigInt is represented as string in GraphQL)
        filterType = build.getTypeByName('StringFilter');
      } else {
        // Map PostgreSQL types to GraphQL filter types
        switch (pgType.category) {
          case 'S': // String type
            filterType = build.getTypeByName('StringFilter');
            break;
          case 'N': // Numeric type
            if (pgType.name.includes('int')) {
              filterType = build.getTypeByName('IntFilter');
            } else {
              filterType = build.getTypeByName('FloatFilter');
            }
            break;
          case 'B': // Boolean type
            filterType = build.getTypeByName('BooleanFilter');
            break;
          case 'D': // Date/time type
            filterType = build.getTypeByName('DatetimeFilter');
            break;
          default:
            // For other types, use string filter as default
            filterType = build.getTypeByName('StringFilter');
        }
      }

      // If specific filter type not found, use string filter
      if (!filterType) {
        filterType = build.getTypeByName('StringFilter');
      }

      // Add field filter
      if (filterType) {
        enhancedFields[fieldName] = {
          type: filterType,
          description: `Filter by the object's \`${attr.name}\` field.`
        };
      }
    });

    return enhancedFields;
  });

  // Ensure sorting options are generated for all fields
  builder.hook('GraphQLEnumType:values', (values, build, context) => {
    const {
      scope: { isPgRowSortEnum, pgIntrospection: table }
    } = context;

    if (!isPgRowSortEnum || !table || table.kind !== 'class') {
      return values;
    }

    const enhancedValues = { ...values };

    // Add ASC and DESC sorting options for each field
    table.attributes.forEach((attr: any) => {
      const columnName = build.inflection.column(attr);
      const enumName = build.inflection.constantCase(columnName);

      // Add ascending sort
      const ascKey = `${enumName}_ASC`;
      if (!enhancedValues[ascKey]) {
        enhancedValues[ascKey] = {
          value: {
            alias: `${attr.name.toLowerCase()}_ASC`,
            specs: [[attr.name, true]]
          },
          description: `Sorts by ${attr.name} in ascending order.`
        };
      }

      // Add descending sort
      const descKey = `${enumName}_DESC`;
      if (!enhancedValues[descKey]) {
        enhancedValues[descKey] = {
          value: {
            alias: `${attr.name.toLowerCase()}_DESC`,
            specs: [[attr.name, false]]
          },
          description: `Sorts by ${attr.name} in descending order.`
        };
      }
    });

    return enhancedValues;
  });

  // Extend condition filters to support all fields
  builder.hook('GraphQLInputObjectType:fields', (fields, build, context) => {
    const {
      scope: { isPgCondition, pgIntrospection: table }
    } = context;

    if (!isPgCondition || !table || table.kind !== 'class') {
      return fields;
    }

    const enhancedFields = { ...fields };

    // Add condition filters for each field
    table.attributes.forEach((attr: any) => {
      const fieldName = build.inflection.column(attr);

      // Skip fields that already exist
      if (enhancedFields[fieldName]) {
        return;
      }

      // Get GraphQL type
      const gqlType = build.pgGetGqlTypeByTypeIdAndModifier(attr.typeId, attr.typeModifier);

      if (gqlType) {
        enhancedFields[fieldName] = {
          type: gqlType,
          description: `Checks for equality with the object's \`${attr.name}\` field.`
        };
      }
    });

    return enhancedFields;
  });
};

export default AllFieldsFilterPlugin;
