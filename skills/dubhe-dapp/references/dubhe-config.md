# DubheConfig Reference

## Recommended Usage

Import `defineConfig` from `@0xobelisk/sui-common` for full TypeScript type
checking and IDE autocompletion:

```typescript
import { defineConfig } from '@0xobelisk/sui-common';

export const dubheConfig = defineConfig({
  name: 'my_game',
  description: 'My on-chain game',
  resources: { ... },
});
```

`defineConfig` is a lightweight type helper that returns the config as-is with
full typing. You can also use `as DubheConfig` for inline configs.

---

## Type Definition

```typescript
// from @0xobelisk/sui-common
type DubheConfig = {
  name: string;
  description: string;
  enums?: Record<string, string[]>;
  resources?: Record<string, Component | MoveType>;
  errors?: Record<string, ErrorEntry>;
};

// ErrorEntry can be a plain string or an object with a message property.
type ErrorEntry = string | { message: string };

type Component = {
  fields: Record<string, MoveType>;
  global?: boolean; // default false
  keys?: string[]; // default [] (no composite keys)
  offchain?: boolean; // default false
};

type MoveType =
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
  | 'vector<String>'
  | string; // custom enum name defined in enums
```

## Top-Level Fields

### `name` (required)

The Move package name. Used as module path prefix in generated code.

```typescript
name: 'my_game';
// generates: module my_game::player { ... }
```

### `description` (required)

Human-readable description of the DApp. Appears in generate output.

### `resources` (optional)

A map of resource name → resource definition. Each resource generates one Move module
under `sources/codegen/resources/<name>.move`. When omitted, no resource modules
are generated (useful for DApps that only use errors and enums).

### `enums` (optional)

Custom enum types to generate as Move enums. Values become variant names.

```typescript
enums: {
  Direction: ['North', 'East', 'South', 'West'],
  Status: ['Active', 'Paused', 'Banned'],
}
// Reference in resources: fields: { dir: 'Direction' }
```

### `errors` (optional)

Error constants to generate in `codegen/error.move`. The key becomes the constant
name (SCREAMING_SNAKE_CASE in Move). The value can be a plain string message or an
object with a `message` property.

```typescript
errors: {
  not_found: 'Record not found',                      // string shorthand
  no_permission: { message: 'No permission' },         // object form (equivalent)
}
// generates:
// const NOT_FOUND: vector<u8> = b"Record not found";
// public fun not_found_error(condition: bool) { assert!(condition, NOT_FOUND) }
```

## Resource Options

### `fields` (required)

Map of field name → Move type. All listed fields are stored together as a record.

### `global` (optional, default: `false`)

When `true`, the resource is a **singleton** — there is exactly one record for the
entire DApp, not one per user/entity. No `resource_address` or lookup key is needed.

```typescript
game_config: {
  global: true,
  fields: { max_level: 'u32', admin_fee: 'u256' },
}
// usage: game_config::get_max_level(dapp_storage)
// usage: game_config::set_max_level(dapp_storage, 100, ctx)
```

### `keys` (optional, default: `[]`)

An array of field names that form the composite lookup key. When specified, the
generated module indexes records by those fields.

```typescript
player_item: {
  fields: { player: 'address', item_id: 'u32', quantity: 'u64' },
  keys: ['player', 'item_id'],
}
// usage: player_item::get_quantity(user_storage, player_addr, item_id)
// usage: player_item::set(user_storage, player_addr, item_id, quantity, ctx)
```

### `offchain` (optional, default: `false`)

When `true`, writes emit an event but do **not** persist data on-chain. Useful for
activity feeds or analytics that are consumed off-chain.

```typescript
action_log: {
  offchain: true,
  fields: { player: 'address', action: 'String' },
  keys: ['player'],
}
```

## Shorthand Syntax

A resource can be defined as a bare `MoveType` string (no `fields` wrapper).
This generates a single-value resource:

```typescript
resources: {
  score: 'u64',           // single u64 value per entity (user resource)
  status: 'Direction',    // single enum value per entity (user resource)
}
// usage: score::get(user_storage): u64
// usage: score::set(user_storage, value, ctx)
```

## Complete Example

```typescript
import { defineConfig } from '@0xobelisk/sui-common';

export const dubheConfig = defineConfig({
  name: 'rpg',
  description: 'On-chain RPG game',

  enums: {
    Class: ['Warrior', 'Mage', 'Rogue']
  },

  resources: {
    // Singleton global config
    game_config: {
      global: true,
      fields: {
        max_level: 'u32',
        base_hp: 'u64',
        admin: 'address'
      }
    },

    // Per-player character, keyed by player address
    character: {
      fields: {
        player: 'address',
        class: 'Class',
        hp: 'u64',
        level: 'u32'
      },
      keys: ['player']
    },

    // Per-player inventory item, keyed by player + item_id
    inventory: {
      fields: {
        player: 'address',
        item_id: 'u32',
        quantity: 'u64'
      },
      keys: ['player', 'item_id']
    },

    // Off-chain action log (emits events only, no on-chain storage)
    action_log: {
      offchain: true,
      fields: {
        player: 'address',
        description: 'String'
      },
      keys: ['player']
    }
  },

  errors: {
    character_not_found: 'Character not found',
    max_level_reached: 'Already at max level',
    insufficient_items: 'Not enough items'
  }
});
```
