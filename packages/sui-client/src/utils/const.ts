import { MapObjectStruct } from 'src/types';
import { fromHex, toHex, bcs } from '@mysten/bcs';

export const BasicBcsTypes: MapObjectStruct = {
  address: bcs.bytes(32).transform({
    // To change the input type, you need to provide a type definition for the input
    input: (val: string) => fromHex(val),
    output: (val) => toHex(val)
  }),
  u8: bcs.u8(),
  u16: bcs.u16(),
  u32: bcs.u32(),
  u64: bcs.u64(),
  u128: bcs.u128(),
  u256: bcs.u256(),
  bool: bcs.bool(),
  '0x1::ascii::String': bcs.string(),
  '0x1::string::String': bcs.string(),
  '0x1::option::Option<address>': bcs.option(
    bcs.bytes(32).transform({
      // To change the input type, you need to provide a type definition for the input
      input: (val: string) => fromHex(val),
      output: (val) => toHex(val)
    })
  ),
  '0x1::option::Option<u8>': bcs.option(bcs.u8()),
  '0x1::option::Option<u16>': bcs.option(bcs.u16()),
  '0x1::option::Option<u32>': bcs.option(bcs.u32()),
  '0x1::option::Option<u64>': bcs.option(bcs.u64()),
  '0x1::option::Option<u128>': bcs.option(bcs.u128()),
  '0x1::option::Option<u256>': bcs.option(bcs.u256()),
  '0x1::option::Option<bool>': bcs.option(bcs.bool()),
  '0x1::option::Option<vector<address>>': bcs.option(
    bcs.vector(
      bcs.bytes(32).transform({
        // To change the input type, you need to provide a type definition for the input
        input: (val: string) => fromHex(val),
        output: (val) => toHex(val)
      })
    )
  ),
  '0x1::option::Option<vector<u8>>': bcs.option(bcs.vector(bcs.u8())),
  '0x1::option::Option<vector<u16>>': bcs.option(bcs.vector(bcs.u16())),
  '0x1::option::Option<vector<u32>>': bcs.option(bcs.vector(bcs.u32())),
  '0x1::option::Option<vector<u64>>': bcs.option(bcs.vector(bcs.u64())),
  '0x1::option::Option<vector<u128>>': bcs.option(bcs.vector(bcs.u128())),
  '0x1::option::Option<vector<u256>>': bcs.option(bcs.vector(bcs.u256())),
  '0x1::option::Option<vector<bool>>': bcs.option(bcs.vector(bcs.bool())),
  'vector<address>': bcs.vector(
    bcs.bytes(32).transform({
      // To change the input type, you need to provide a type definition for the input
      input: (val: string) => fromHex(val),
      output: (val) => toHex(val)
    })
  ),
  'vector<u8>': bcs.vector(bcs.u8()),
  'vector<u16>': bcs.vector(bcs.u16()),
  'vector<u32>': bcs.vector(bcs.u32()),
  'vector<u64>': bcs.vector(bcs.u64()),
  'vector<u128>': bcs.vector(bcs.u128()),
  'vector<u256>': bcs.vector(bcs.u256()),
  'vector<bool>': bcs.vector(bcs.bool()),
  'vector<vector<address>>': bcs.vector(
    bcs.vector(
      bcs.bytes(32).transform({
        // To change the input type, you need to provide a type definition for the input
        input: (val: string) => fromHex(val),
        output: (val) => toHex(val)
      })
    )
  ),
  'vector<vector<u8>>': bcs.vector(bcs.vector(bcs.u8())),
  'vector<vector<u16>>': bcs.vector(bcs.vector(bcs.u16())),
  'vector<vector<u32>>': bcs.vector(bcs.vector(bcs.u32())),
  'vector<vector<u64>>': bcs.vector(bcs.vector(bcs.u64())),
  'vector<vector<u128>>': bcs.vector(bcs.vector(bcs.u128())),
  'vector<vector<u256>>': bcs.vector(bcs.vector(bcs.u256())),
  'vector<vector<bool>>': bcs.vector(bcs.vector(bcs.bool())),
  '0x2::coin::Coin<T>': bcs.struct('Coin', {
    id: bcs.fixedArray(32, bcs.u8()).transform({
      input: (id: string) => fromHex(id),
      output: (id) => toHex(Uint8Array.from(id))
    }),
    balance: bcs.struct('Balance', {
      value: bcs.u64()
    })
  }),
  '0x2::balance::Balance<T>': bcs.struct('Balance', {
    value: bcs.u64()
  })
};
