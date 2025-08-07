export type ComponentType = 'Onchain' | 'Offchain';

export type MoveType =
  | 'address'
  | 'bool'
  | 'u8'
  | 'u32'
  | 'u64'
  | 'u128'
  | 'u256'
  | 'String'
  | 'vector<address>'
  | 'vector<bool>'
  | 'vector<u8>'
  | 'vector<vector<u8>>'
  | 'vector<u32>'
  | 'vector<u64>'
  | 'vector<u128>'
  | 'vector<u256>'
  | string;

// Define the type of Schema
export type Component = {
  offchain?: boolean;
  fields: Record<string, MoveType>;
  keys?: string[];
};

// Empty object type, used to represent components with only id key
export type EmptyComponent = Record<string, never>;

export type DubheConfig = {
  name: string;
  description: string;
  enums?: Record<string, string[]>;
  components: Record<string, Component | MoveType | EmptyComponent>;
  resources: Record<string, Component | MoveType>;
  errors?: Record<string, string>;
};

export type DubheMetadata = {
  components: Record<string, Component | MoveType | EmptyComponent>;
  resources: Record<string, Component | MoveType>;
  enums: Record<string, string[]>;
};
