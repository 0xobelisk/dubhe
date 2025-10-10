import { gql } from '@apollo/client';
import { createDubheGraphqlClient, DubheGraphqlClient } from '../src/libs/dubheGraphqlClient';

// Utility function: Convert number to 64-bit string format (no base conversion, just pad with 0s)
function toHex64String(num: number): string {
  // Convert number to string, then pad to 64 bits (pad with 0s in front)
  const numStr = num.toString();
  const padded = numStr.padStart(64, '0');
  return `0x${padded}`;
}

// Type definitions
interface EncounterNode {
  nodeId: string;
  player?: string;
  monster?: string;
  catchAttempts?: string;
  exists?: boolean;
}

interface EncountersQueryResult {
  encounters: {
    nodes: EncounterNode[];
  };
}

const CONFIG = {
  endpoint: 'http://localhost:4000/graphql',
  headers: {
    'Content-Type': 'application/json'
  }
};

async function testSingleQueries() {
  console.log('🚀 === Single Data Query Test ===\n');

  const client = createDubheGraphqlClient(CONFIG);

  try {
    // Method 1: Use getTableByCondition (if supported)
    console.log('📋 Method 1: Using getTableByCondition');
    try {
      const singleRecord = await client.getTableByCondition(
        'encounters',
        { player: toHex64String(1) },
        ['nodeId', 'player', 'monster', 'catchAttempts', 'exists']
      );

      if (singleRecord) {
        console.log('✅ Successfully queried single record:');
        console.log(`   Player: ${singleRecord.player}`);
        console.log(`   Monster: ${singleRecord.monster}`);
        console.log(`   Catch Attempts: ${singleRecord.catchAttempts}`);
        console.log(`   Exists: ${singleRecord.exists}`);
      } else {
        console.log('❌ No matching record found');
      }
    } catch (error) {
      console.log('ℹ️ getTableByCondition method not supported, error:', (error as Error).message);
    }

    console.log('\n' + '─'.repeat(50) + '\n');

    // Method 2: Use getAllTables limited to 1 record
    console.log('📋 Method 2: Using getAllTables + first: 1');

    const result = await client.getAllTables('encounters', {
      first: 1,
      filter: {
        player: { equalTo: toHex64String(5) }
      },
      fields: ['nodeId', 'player', 'monster', 'catchAttempts', 'exists']
    });

    if (result.edges && result.edges.length > 0) {
      const record = result.edges[0].node;
      console.log('✅ Successfully queried single record:');
      console.log(`   Player: ${record.player}`);
      console.log(`   Monster: ${record.monster}`);
      console.log(`   Catch Attempts: ${record.catchAttempts}`);
      console.log(`   Exists: ${record.exists}`);
      console.log(`   NodeId: ${record.nodeId}`);
    } else {
      console.log('❌ No matching record found');
    }

    console.log('\n' + '─'.repeat(50) + '\n');

    // Method 3: Query first record with specific condition
    console.log('📋 Method 3: Query records with specific condition');

    const catchResult = await client.getAllTables('encounters', {
      first: 1,
      filter: {
        catchAttempts: { equalTo: '10' }
      },
      fields: ['nodeId', 'player', 'catchAttempts']
    });

    if (catchResult.edges && catchResult.edges.length > 0) {
      const record = catchResult.edges[0].node;
      console.log('✅ Found record with catchAttempts = 10:');
      console.log(`   Player: ${record.player}`);
      console.log(`   Catch Attempts: ${record.catchAttempts}`);
    } else {
      console.log('ℹ️ No record found with catchAttempts = 10');
    }

    console.log('\n' + '─'.repeat(50) + '\n');

    // Method 4: Use native GraphQL query for single record
    console.log('📋 Method 4: Using native GraphQL query');

    const SINGLE_QUERY = gql`
      query GetSingleEncounter($playerValue: String!) {
        encounters(first: 1, filter: { player: { equalTo: $playerValue } }) {
          nodes {
            nodeId
            player
            monster
            catchAttempts
            exists
          }
        }
      }
    `;

    const queryResult = await client.query<EncountersQueryResult>(SINGLE_QUERY, {
      playerValue: toHex64String(3)
    });

    if (queryResult.data && queryResult.data.encounters.nodes.length > 0) {
      const record = queryResult.data.encounters.nodes[0];
      console.log('✅ Native GraphQL query successful:');
      console.log(`   Player: ${record.player}`);
      console.log(`   Monster: ${record.monster}`);
      console.log(`   Catch Attempts: ${record.catchAttempts}`);
      console.log(`   Exists: ${record.exists}`);
    } else {
      console.log('❌ Native query found no records');
    }

    console.log('\n' + '─'.repeat(50) + '\n');

    // Method 5: Query non-existent record (test error handling)
    console.log('📋 Method 5: Query non-existent record');

    const notFoundResult = await client.getAllTables('encounters', {
      first: 1,
      filter: {
        player: { equalTo: toHex64String(99999) }
      },
      fields: ['nodeId', 'player']
    });

    if (notFoundResult.edges && notFoundResult.edges.length === 0) {
      console.log('✅ Correctly handled non-existent record query');
    } else {
      console.log('⚠️ Unexpectedly found record');
    }

    console.log('\n' + '─'.repeat(50) + '\n');

    // Additional demo: Batch query different players
    console.log('📋 Additional demo: Query multiple different players');
    for (let i = 0; i < 3; i++) {
      const playerAddress = toHex64String(i);
      console.log(`\nQuerying player ${i}: ${playerAddress}`);

      const playerResult = await client.getAllTables('encounters', {
        first: 1,
        filter: { player: { equalTo: playerAddress } },
        fields: ['player', 'catchAttempts', 'exists']
      });

      if (playerResult.edges && playerResult.edges.length > 0) {
        const record = playerResult.edges[0].node;
        console.log(
          `   ✅ Found record: catchAttempts=${record.catchAttempts}, exists=${record.exists}`
        );
      } else {
        console.log(`   ❌ No record found`);
      }
    }
  } catch (error) {
    console.error('❌ Error occurred during query:', error);
  } finally {
    client.close();
    console.log('\n🔚 Test completed, client closed');
  }
}

// Run test
if (require.main === module) {
  testSingleQueries().catch(console.error);
}

export { testSingleQueries };
