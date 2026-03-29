export type BaseType =
  | 'string'
  | 'vector<string>'
  | 'address'
  | 'bool'
  | 'u8'
  | 'u64'
  | 'u128'
  | 'vector<address>'
  | 'vector<bool>'
  | 'vector<u8>'
  | 'vector<vector<u8>>'
  | 'vector<u64>'
  | 'vector<u128>';

type Address = string;
type Bool = boolean;
type U8 = number;
type U64 = number;
type U128 = number;
type Vector<T> = T[];

export type BaseValueType =
  | string
  | Address
  | Bool
  | U8
  | U64
  | U128
  | Vector<Address>
  | Vector<Bool>
  | Vector<U8>
  | Vector<Vector<U8>>
  | Vector<U64>
  | Vector<U128>;

export interface ValueType {
  valueType: BaseType | Record<string, BaseType>;
  ephemeral?: boolean;
  defaultValue?: BaseValueType | Record<string, BaseValueType>;
}

export type SchemaMapType = BaseType | ValueType;

export type DubheConfig = {
  name: string;
  description: string;
  systems: string[];
  schemas: Record<string, SchemaMapType>;
};

export type MoveType =
  | 'string'
  | 'vector<string>'
  | 'String'
  | 'vector<String>'
  | 'address'
  | 'bool'
  | 'u8'
  | 'u64'
  | 'u128'
  | 'vector<address>'
  | 'vector<bool>'
  | 'vector<u8>'
  | 'vector<vector<u8>>'
  | 'vector<u64>'
  | 'vector<u128>';

export interface RenderSchemaOptions {
  projectName: string;
  systems: string[];
  schemaName: string;
  structName: string;
  ephemeral: boolean;
  singleton: boolean;
  valueType: MoveType | Record<string, MoveType>; // move type
  realType: BaseType | Record<string, BaseType>; // ts type
  // structAttrs: string[];
  // structTypes: string[];
  defaultValue: BaseValueType | Record<string, BaseValueType> | undefined;
  needImportString: boolean;
}
