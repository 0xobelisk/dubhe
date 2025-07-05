// PostGraphile plugin for filtering queries
import { Plugin } from 'postgraphile';

// Query filter plugin - only keep useful table-related queries
export const QueryFilterPlugin: Plugin = (builder) => {
  // Filter query fields
  builder.hook('GraphQLObjectType:fields', (fields, build, context) => {
    const {
      scope: { isRootQuery }
    } = context;

    if (!isRootQuery) {
      return fields;
    }

    // Define query types to keep
    const allowedQueries = new Set<string>();

    // Get all table-related queries
    Object.keys(fields).forEach((fieldName) => {
      // Keep PostGraphile required system fields
      if (['query', 'nodeId', 'node'].includes(fieldName)) {
        allowedQueries.add(fieldName);
      }

      // Keep store table-related queries
      if (fieldName.match(/^(allStore|store)/i)) {
        allowedQueries.add(fieldName);
      }

      // Keep table_fields table queries
      if (fieldName.match(/^(allTable|table)/i)) {
        allowedQueries.add(fieldName);
      }
    });

    // Filter fields, only keep allowed queries
    const filteredFields: typeof fields = {};
    Object.keys(fields).forEach((fieldName) => {
      if (allowedQueries.has(fieldName)) {
        filteredFields[fieldName] = fields[fieldName];
      }
    });

    // console.log('🔍 Filtered query fields:', Object.keys(filteredFields));
    return filteredFields;
  });
};

export default QueryFilterPlugin;
