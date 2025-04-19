export type BaseType =
  | 'String'
  | 'vector<String>'
  | 'address'
  | 'bool'
  | 'u8'
  | 'u32'
  | 'u64'
  | 'u128'
  | 'vector<address>'
  | 'vector<bool>'
  | 'vector<u8>'
  | 'vector<vector<u8>>'
  | 'vector<u32>'
  | 'vector<u64>'
  | 'vector<u128>'
  | string;

export type StorageDataType = 'Struct' | 'Enum';

export type StorageMapType = 'Map' | 'Bag' | 'Table';

type Address = string;
type Bool = boolean;
type U8 = number;
type U32 = number;
type U64 = number;
type U128 = number;
type Vector<T> = T[];

export type BaseValueType =
  | String
  | Address
  | Bool
  | U8
  | U32
  | U64
  | U128
  | Vector<Address>
  | Vector<Bool>
  | Vector<U8>
  | Vector<Vector<U8>>
  | Vector<U64>
  | Vector<U128>;

export type SchemaData = Record<string, string> | string[];
export type SchemaType = string;
export type EventData = Record<string, string>;
export type ErrorData = Record<string, string>;

type DataType = any;

export function storage<T extends DataType>(value: T): SchemaType;
export function storage<K extends DataType, V extends DataType>(key: K, value: V): SchemaType;
export function storage<K1 extends DataType, K2 extends DataType, V extends DataType>(
  key1: K1,
  key2: K2,
  value: V
): SchemaType;
export function storage(...args: DataType[]): SchemaType {
  if (args.length === 1) {
    return `StorageValue<${args[0]}>`;
  } else if (args.length === 2) {
    return `StorageMap<${args[0]}, ${args[1]}>`;
  } else if (args.length === 3) {
    return `StorageDoubleMap<${args[0]}, ${args[1]}, ${args[2]}>`;
  }
  throw new Error('Invalid number of arguments for storage()');
}

export type Plugin = 'merak';

export type DubheConfig = {
  name: string;
  description: string;
  data?: Record<string, SchemaData>;
  schemas: Record<string, SchemaType>;
  events?: Record<string, EventData>;
  errors?: ErrorData;
  plugins?: Plugin[];
};

export type MoveType =
  | 'string'
  | 'vector<string>'
  | 'String'
  | 'vector<String>'
  | 'address'
  | 'bool'
  | 'u8'
  | 'u32'
  | 'u64'
  | 'u128'
  | 'vector<address>'
  | 'vector<bool>'
  | 'vector<u8>'
  | 'vector<vector<u8>>'
  | 'vector<u32>'
  | 'vector<u64>'
  | 'vector<u128>';
