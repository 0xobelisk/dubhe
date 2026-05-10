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

      // Step 1: Remove "all" prefix
      if (fieldName.startsWith('all') && !['allRows', 'allTableFields'].includes(fieldName)) {
        newFieldName = fieldName.replace(/^all/, '');
        if (newFieldName.length > 0) {
          newFieldName = newFieldName.charAt(0).toLowerCase() + newFieldName.slice(1);
        }
      }

      // Step 2: Routing by table origin
      if (newFieldName.startsWith('store') && newFieldName !== 'store') {
        // User-defined store_* tables: strip "store" prefix
        // storeWheat -> wheat, storeFarmPlots -> farmPlots
        const withoutStore = newFieldName.replace(/^store/, '');
        if (withoutStore.length > 0) {
          const candidate = withoutStore.charAt(0).toLowerCase() + withoutStore.slice(1);
          if (!renamedFields[candidate] && !originalFieldNames.includes(candidate)) {
            newFieldName = candidate;
          }
          // If conflict, keep the name without store strip (keeps "storeXxx")
        }
      } else if (newFieldName.startsWith('dubhe') && newFieldName !== 'dubhe') {
        // Tables already prefixed with dubhe_ keep their name as-is:
        // allDubheEvents -> dubheEvents  (no change needed)
      } else if (newFieldName !== fieldName) {
        // System tables (non store_*, non dubhe_*): add "dubhe" namespace prefix
        // to prevent conflicts with any future user store_* table.
        // sessions -> dubheSessions, userStorages -> dubheUserStorages,
        // marketplaceListings -> dubheMarketplaceListings
        const candidate = 'dubhe' + newFieldName.charAt(0).toUpperCase() + newFieldName.slice(1);
        if (!renamedFields[candidate] && !originalFieldNames.includes(candidate)) {
          newFieldName = candidate;
        }
      }

      // Guard: if the final name still collides, fall back to original
      if (renamedFields[newFieldName]) {
        console.warn(`⚠️ Field name conflict: ${newFieldName}, keeping original name ${fieldName}`);
        newFieldName = fieldName;
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
      return fields;
    }

    return renamedFields;
  });
};

export default SimpleNamingPlugin;
