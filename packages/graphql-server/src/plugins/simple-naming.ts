import { Plugin } from 'postgraphile';

export const SimpleNamingPlugin: Plugin = (builder) => {
  // Rename query fields
  builder.hook('GraphQLObjectType:fields', (fields, build, context) => {
    const {
      scope: { isRootQuery }
    } = context;

    if (!isRootQuery) {
      return fields;
    }

    // Create renamed field mapping
    const renamedFields: typeof fields = {};
    const originalFieldNames = Object.keys(fields);

    console.log('🔍 Original field list:', originalFieldNames);

    // For tracking rename mapping
    const renameMap: Record<string, string> = {};

    originalFieldNames.forEach((fieldName) => {
      let newFieldName = fieldName;

      // Remove "all" prefix, but keep system fields
      if (
        fieldName.startsWith('all') &&
        !['allRows', 'allTableFields'].includes(fieldName) // Extend reserved list
      ) {
        // allStoreAccounts -> storeAccounts
        // allStoreEncounters -> storeEncounters
        newFieldName = fieldName.replace(/^all/, '');
        // First letter to lowercase, maintain camelCase
        if (newFieldName.length > 0) {
          newFieldName = newFieldName.charAt(0).toLowerCase() + newFieldName.slice(1);
        }
      }

      // Remove "store" prefix (note lowercase s, because it's already processed above)
      if (newFieldName.startsWith('store') && newFieldName !== 'store') {
        // storeAccounts -> accounts
        // storeAccount -> account
        // storeEncounters -> encounters
        // storeEncounter -> encounter
        const withoutStore = newFieldName.replace(/^store/, '');
        // First letter to lowercase, maintain camelCase
        if (withoutStore.length > 0) {
          const finalName = withoutStore.charAt(0).toLowerCase() + withoutStore.slice(1);

          // Check if field name conflict will occur
          if (!renamedFields[finalName] && !originalFieldNames.includes(finalName)) {
            newFieldName = finalName;
          }
          // If conflict, keep original name (remove all but keep store)
        }
      }

      // Check if final field name will conflict
      if (renamedFields[newFieldName]) {
        console.warn(`⚠️ Field name conflict: ${newFieldName}, keeping original name ${fieldName}`);
        newFieldName = fieldName; // Keep original name to avoid conflict
      }

      renameMap[fieldName] = newFieldName;
      renamedFields[newFieldName] = fields[fieldName];
    });

    const renamedCount = Object.entries(renameMap).filter(
      ([old, newName]) => old !== newName
    ).length;
    const finalFieldNames = Object.keys(renamedFields);

    console.log('🔄 Field rename statistics:', {
      'Original field count': originalFieldNames.length,
      'Final field count': finalFieldNames.length,
      'Renamed field count': renamedCount
    });

    if (renamedCount > 0) {
      console.log(
        '📝 Rename mapping:',
        Object.entries(renameMap)
          .filter(([old, newName]) => old !== newName)
          .reduce((acc, [old, newName]) => ({ ...acc, [old]: newName }), {})
      );
    }

    // Ensure field count is not lost
    if (finalFieldNames.length !== originalFieldNames.length) {
      console.error(
        '❌ Fields lost! Original:',
        originalFieldNames.length,
        'Final:',
        finalFieldNames.length
      );
      // If fields are lost, return original fields to avoid breakage
      return fields;
    }

    return renamedFields;
  });
};

export default SimpleNamingPlugin;
