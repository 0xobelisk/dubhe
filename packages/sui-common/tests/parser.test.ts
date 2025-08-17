import { parseData } from '../src';
// import { formatMove } from '../src'; // Unused
import { describe, it } from 'vitest';
// import { expect } from 'vitest'; // Unused

describe('Parse data', async () => {
  it('formats Move code', async () => {
    // const data = {
    //     name: 'monster_catch_attempt_event',
    //     value: {
    //         monster: '0x00000000000000000000000000000000000000000000000000000194ac08ecb2',
    //         player: '0x9a66b2da3036badd22529e3de8a00b0cd7dbbfe589873aa03d5f885f5f8c6501',
    //         result: {
    //             type: '0x76acae9c5c903d527e1d2315d9f9168e51613bbda85588b93bb8e62f2bcbf5b1::monster_catch_result::MonsterCatchResult',
    //             variant: 'Caught',
    //             fields: {}
    //         }
    //     }
    // };
    // console.log(parseData(data))
    //
    // const data1 = {
    //     key1: '0x9a66b2da3036badd22529e3de8a00b0cd7dbbfe589873aa03d5f885f5f8c6501',
    //     key2: null,
    //     name: 'owned_by',
    //     value: [
    //         '0x00000000000000000000000000000000000000000000000000000194ac08ecb2'
    //     ]
    // }
    // console.log(parseData(data1))
    //
    // const data2 = {
    //     key1: null,
    //     key2: null,
    //     name: 'monster_catch_attempt_event',
    //     value: {
    //         type: '0x76acae9c5c903d527e1d2315d9f9168e51613bbda85588b93bb8e62f2bcbf5b1::monster_catch_attempt_event::MonsterCatchAttemptEvent',
    //         fields: {
    //             monster: '0x00000000000000000000000000000000000000000000000000000194ac08ecb2',
    //             player: '0x9a66b2da3036badd22529e3de8a00b0cd7dbbfe589873aa03d5f885f5f8c6501',
    //             result: {
    //                 type: '0x76acae9c5c903d527e1d2315d9f9168e51613bbda85588b93bb8e62f2bcbf5b1::monster_catch_result::MonsterCatchResult',
    //                 variant: 'Caught',
    //                 fields: {}
    //             }
    //         }
    //     }
    // }
    //
    // console.log(parseData(data2))
    //
    //
    // const data3 = {
    //     key1:{
    //         type: '0x9a66b2da3036badd22529e3de8a00b0cd7dbbfe589873aa03d5f885f5f8c6501::monster_info::MonsterInfo',
    //         fields: {
    //             catch_attempts: '0',
    //             monster: '0x9a66b2da3036badd22529e3de8a00b0cd7dbbfe589873aa03d5f885f5f8c6501'
    //         }
    //     },
    //     key2: null,
    //     name: 'monster_info',
    //     value: {
    //         type: '0x76acae9c5c903d527e1d2315d9f9168e51613bbda85588b93bb8e62f2bcbf5b1::monster_info::MonsterInfo',
    //         fields: {
    //             catch_attempts: '0',
    //             monster: '0x00000000000000000000000000000000000000000000000000000194ac08ecb2'
    //         }
    //     }
    // }
    //
    // console.log(parseData(data3))
    //
    //
    // const data4 = {
    //     key1:{
    //         type: '0x9a66b2da3036badd22529e3de8a00b0cd7dbbfe589873aa03d5f885f5f8c6501::monster_info::MonsterInfo',
    //         fields: {
    //             catch_attempts: '0',
    //             monster: '0x9a66b2da3036badd22529e3de8a00b0cd7dbbfe589873aa03d5f885f5f8c6501'
    //         }
    //     },
    //     key2: null,
    //     name: 'monster_info',
    //     value: {
    //         type: '0x76acae9c5c903d527e1d2315d9f9168e51613bbda85588b93bb8e62f2bcbf5b1::monster_info::MonsterInfo',
    //         fields: {
    //             type: '0x9a66b2da3036badd22529e3de8a00b0cd7dbbfe589873aa03d5f885f5f8c6501::monster_info::MonsterInfo',
    //             fields: {
    //                 catch_attempts: '0',
    //                 monster: '0x9a66b2da3036badd22529e3de8a00b0cd7dbbfe589873aa03d5f885f5f8c6501'
    //             }
    //         }
    //     }
    // }
    //
    // console.log(parseData(data4))
    //
    //
    // const data5 = {
    //     key1: null,
    //     key2: null,
    //     name: 'monster_catch_attempt_event',
    //     value: [
    //         [
    //             {
    //                 type: '0x76acae9c5c903d527e1d2315d9f9168e51613bbda85588b93bb8e62f2bcbf5b1::monster_catch_attempt_event::MonsterCatchAttemptEvent',
    //                 fields: {
    //                     monster: '0x00000000000000000000000000000000000000000000000000000194ac08ecb2',
    //                     player: '0x9a66b2da3036badd22529e3de8a00b0cd7dbbfe589873aa03d5f885f5f8c6501',
    //                     result: {
    //                         type: '0x76acae9c5c903d527e1d2315d9f9168e51613bbda85588b93bb8e62f2bcbf5b1::monster_catch_result::MonsterCatchResult',
    //                         variant: 'Caught',
    //                         fields: {}
    //                     }
    //                 }
    //             },
    //             {
    //                 type: '0x76acae9c5c903d527e1d2315d9f9168e51613bbda85588b93bb8e62f2bcbf5b1::monster_catch_attempt_event::MonsterCatchAttemptEvent',
    //                 fields: {
    //                     monster: '0x00000000000000000000000000000000000000000000000000000194ac08ecb2',
    //                     player: '0x9a66b2da3036badd22529e3de8a00b0cd7dbbfe589873aa03d5f885f5f8c6501',
    //                     result: {
    //                         type: '0x76acae9c5c903d527e1d2315d9f9168e51613bbda85588b93bb8e62f2bcbf5b1::monster_catch_result::MonsterCatchResult',
    //                         variant: 'Caught',
    //                         fields: {}
    //                     }
    //                 }
    //             },
    //         ]
    //     ]
    // }
    // console.log(JSON.stringify(parseData(data5)))

    const data6 = {
      key1: null,
      key2: null,
      name: 'monster_catch_attempt_event',
      value: {
        height: '13',
        terrain: [
          {
            type: '0x850d2d3bcd063f30a7e8da27a0a60cd68bbc09107b8f6b89a270cdd67d200435::terrain_type::TerrainType',
            variant: 'None',
            fields: {}
          },
          {
            type: '0x850d2d3bcd063f30a7e8da27a0a60cd68bbc09107b8f6b89a270cdd67d200435::terrain_type::TerrainType',
            variant: 'None',
            fields: {}
          },
          {
            type: '0x850d2d3bcd063f30a7e8da27a0a60cd68bbc09107b8f6b89a270cdd67d200435::terrain_type::TerrainType',
            variant: 'None',
            fields: {}
          },
          {
            type: '0x850d2d3bcd063f30a7e8da27a0a60cd68bbc09107b8f6b89a270cdd67d200435::terrain_type::TerrainType',
            variant: 'None',
            fields: {}
          }
        ]
      }
    };
    console.log(JSON.stringify(parseData(data6), null, 2));

    const data7 = {
      key1: null,
      key2: null,
      name: 'monster_catch_attempt_event',
      value: {
        height: '13',
        terrain: [
          [
            {
              type: '0x850d2d3bcd063f30a7e8da27a0a60cd68bbc09107b8f6b89a270cdd67d200435::terrain_type::TerrainType',
              variant: 'None',
              fields: {}
            },
            {
              type: '0x850d2d3bcd063f30a7e8da27a0a60cd68bbc09107b8f6b89a270cdd67d200435::terrain_type::TerrainType',
              variant: 'None',
              fields: {}
            },
            {
              type: '0x850d2d3bcd063f30a7e8da27a0a60cd68bbc09107b8f6b89a270cdd67d200435::terrain_type::TerrainType',
              variant: 'None',
              fields: {}
            },
            {
              type: '0x850d2d3bcd063f30a7e8da27a0a60cd68bbc09107b8f6b89a270cdd67d200435::terrain_type::TerrainType',
              variant: 'None',
              fields: {}
            }
          ]
        ]
      }
    };
    console.log(JSON.stringify(parseData(data7), null, 2));
  });
});
