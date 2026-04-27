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

export type Component = {
  offchain?: boolean;
  global?: boolean;
  fields: Record<string, MoveType>;
  keys?: string[];
  // Storage extension annotations
  reactive?: boolean; // generate _reactive cross-user write variants
  fungible?: boolean; // generate add/sub instead of set
  unique?: boolean; // generate mint + existence-assert on set/transfer
  transferable?: boolean; // generate cross-layer transfer functions
  listable?: boolean; // generate list/buy/cancel_listing/expire_listing
};

/** Config for a DApp-owned named shared object (e.g. guild, boss). */
export type ObjectConfig = {
  fields: Record<string, MoveType>;
  /** Resources (from the `resources` section) this object accepts for transfers. */
  accepts?: string[];
  /** Other objects/scenes whose data can be transferred into this object. */
  acceptsFrom?: string[];
  /** If true, only the DApp admin can call create_<key>. */
  adminOnly?: boolean;
};

/** Config for a multi-participant scene shared object (e.g. pvp_match, dungeon_run). */
export type SceneConfig = {
  fields: Record<string, MoveType>;
  /** Resources this scene accepts for transfers. */
  accepts?: string[];
  /** Other objects/scenes whose data can be transferred into this scene. */
  acceptsFrom?: string[];
};

export type ErrorDefinition = {
  message: string;
};

export type ErrorEntry = string | ErrorDefinition;

export type DubheConfig = {
  name: string;
  description: string;
  enums?: Record<string, string[]>;
  resources?: Record<string, Component | MoveType>;
  objects?: Record<string, ObjectConfig>;
  scenes?: Record<string, SceneConfig>;
  errors?: Record<string, ErrorEntry>;
};

export type DubheMetadata = {
  resources: Record<string, Component | MoveType>;
  enums: Record<string, string[]>;
};

export type BaseType = any;
export type ErrorData = Record<string, ErrorEntry>;
export type EventData = any;
