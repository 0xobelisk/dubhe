import {
  Dubhe,
  NetworkType,
  TransactionArgument,
  loadMetadata,
  Transaction,
  DevInspectResults,
  bcs,
  SuiMoveNormalizedModules,
  fromHex,
  toHex
} from '../src/index';
import dubheMetadata from './numeron_template.json';
import dotenv from 'dotenv';
dotenv.config();

enum DIRECTION {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

function getDirection(direction: string): number {
  switch (direction.toUpperCase()) {
    case DIRECTION.UP:
      return 0;
    case DIRECTION.DOWN:
      return 1;
    case DIRECTION.LEFT:
      return 2;
    case DIRECTION.RIGHT:
      return 3;
    default:
      throw new Error(`Invalid direction: ${direction}. Expected UP, DOWN, LEFT, or RIGHT.`);
  }
}

async function main() {
  const network = 'testnet';
  const packageId = '0x4a32e78c9e54fe50d6fbc10bca503516344e06eac6b7cd0b7603b37498b3d964';
  const DUBHE_SCHEMA_ID = '0xfef203de9d3a2980429e91df535a0503ccf8d3c05aa3815936984243dc96f19f'; // Replace with your actual schema ID

  // const metadata = await loadMetadata(network as NetworkType, packageId);
  // fs.writeFileSync('metadata.json', JSON.stringify(metadata));
  const privateKey = process.env.PRIVATE_KEY;

  const dubhe = new Dubhe({
    networkType: network as NetworkType,
    packageId: packageId,
    metadata: dubheMetadata as SuiMoveNormalizedModules,
    secretKey: privateKey
  });

  console.log(dubhe.getAddress());
  // await dubhe.requestFaucet();
  // let balance = await dubhe.getBalance();
  // console.log('balance', balance);

  const getTableData = await dubhe.queryChannelTable({
    table: 'position',
    key: []
  });

  // console.log('getTableData', getTableData);
  const xData = Uint8Array.from(getTableData.data[0]);
  const yData = Uint8Array.from(getTableData.data[1]);

  // const parsedStringList = bcs.vector(bcs.u64()).parse(datares);
  const parseData = bcs.u64().parse(xData);
  const parseData1 = bcs.u64().parse(yData);
  console.log('x', parseData);
  console.log('y', parseData1);

  // Subscribe to all table changes for all accounts (like curl)
  const unsubscribe = await dubhe.subscribeChannelTable(
    {
      // Not specifying account to subscribe to all accounts
      // Not specifying table to subscribe to all tables
    },
    {
      // Callback when connection established
      onOpen: () => {
        console.log('✅ Successfully connected to channel subscription (all accounts & tables)');
      },

      // Callback when receiving new data
      onMessage: (data) => {
        console.log('📨 Received update:', { table: data.table, account: data.account });

        // Parse the data based on table type
        try {
          if (data.table === 'item_dropped') {
            // Parse item_dropped table data
            const playerData = Uint8Array.from(data.value[0]);
            const itemTypeData = Uint8Array.from(data.value[1]);

            const Address = bcs.bytes(32).transform({
              // To change the input type, you need to provide a type definition for the input
              input: (val: string) => fromHex(val),
              output: (val) => toHex(val)
            });

            // Parse player address (address type in Move)
            const player = Address.parse(playerData);

            // Register and parse ItemType enum
            const ItemTypeBcs = bcs.enum('ItemType', {
              Ball: null,
              Currency: null,
              Food: null,
              Material: null,
              Medicine: null,
              Scroll: null,
              SkillBook: null,
              TreasureChest: null
            });

            const itemType = ItemTypeBcs.parse(itemTypeData);

            console.log('🎁 Item dropped:');
            console.log('  - Player:', player);
            console.log('  - Item Type:', itemType);
          } else if (data.table === 'position') {
            // Parse position table data
            const xData = Uint8Array.from(data.value[0]);
            const yData = Uint8Array.from(data.value[1]);

            const x = bcs.u64().parse(xData);
            const y = bcs.u64().parse(yData);

            console.log(`📍 New position: x=${x}, y=${y}`);
          }
        } catch (error) {
          console.error('Failed to parse data:', error);
          console.error('Table:', data.table);
          console.error('Raw value:', data.value);
        }
      },

      // Callback when error occurs
      onError: (error) => {
        console.error('❌ Subscription error:', error);
      },

      // Callback when connection closed
      onClose: () => {
        console.log('🔌 Subscription connection closed');
      }
    }
  );

  // Keep the subscription alive
  console.log('🔄 Listening for position updates... (Press Ctrl+C to exit)');

  // Keep the process running to receive events
  // The subscription will continue until manually stopped or error occurs

  // Optional: Unsubscribe after 60 seconds
  // setTimeout(() => {
  //   console.log('Unsubscribing...');
  //   unsubscribe();
  //   process.exit(0);
  // }, 60000);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    unsubscribe();
    process.exit(0);
  });
}

main().catch(console.error);
