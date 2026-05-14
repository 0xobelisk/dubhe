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

---

## Type Definition

```typescript
// from @0xobelisk/sui-common
type DubheConfig = {
  name: string;
  description: string;
  enums?: Record<string, string[]>;
  resources?: Record<string, Component | MoveType>;
  objects?: Record<string, ObjectConfig>;
  permits?: Record<string, PermitConfig>;
  scenes?: Record<string, SceneConfig>;
  errors?: Record<string, ErrorEntry>;
};

type Component = {
  fields: Record<string, MoveType>;
  global?: boolean; // default false — stores in DappStorage when true
  keys?: string[]; // composite lookup keys; keyed resources auto-get mint()
  offchain?: boolean; // default false — emit event only, no on-chain state
  reactive?: boolean; // generate set_reactive / set_<field>_reactive
  fungible?: boolean; // generate add / sub (requires single numeric field)
  transferable?: boolean; // generate User ↔ Object/Scene transfer functions
  listable?: boolean; // generate list / buy / cancel_listing / expire_listing
};

type ObjectConfig = {
  fields: Record<string, MoveType>;
  accepts?: string[]; // resource names this object stores
  acceptsFrom?: string[]; // objects/scenes that can transfer into this
  adminOnly?: boolean; // only DApp admin can call create_<key>
};

type PermitConfig = {}; // reserved for future options

type SceneAuthorization =
  | { kind: 'permit'; permit: string } // writes require a ScenePermit
  | { kind: 'system' }; // writes callable by system functions directly

type SceneConfig = {
  fields: Record<string, MoveType>;
  authorization: SceneAuthorization; // required
  accepts?: string[];
  acceptsFrom?: string[];
};

type ErrorEntry = string | { message: string };

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

---

## `resources` — per-user and global data

### Top-level fields

#### `fields` (required)

Map of field name → Move type. All listed fields are stored together as a record.

#### `global` (optional, default: `false`)

When `true`, the resource is a DApp-wide singleton stored in `DappStorage`.
Generated functions take `dapp_storage` instead of `user_storage`.

```typescript
game_config: {
  global: true,
  fields: { max_level: 'u32', admin_fee: 'u256' },
}
// usage: game_config::get_max_level(dapp_storage)
// usage: game_config::set_max_level(dapp_storage, 100)
```

#### `keys` (optional, default: `[]`)

Field names that form the composite lookup key. Non-key fields become the value.
Any keyed, non-offchain, non-global resource automatically gets a `mint` function
that calls `ensure_has_not` before `set`, preventing silent overwrites.

```typescript
inventory: {
  fields: { item_id: 'u32', quantity: 'u64' },
  keys: ['item_id'],
}
// auto-generated: mint(user_storage, item_id, quantity, ctx) — asserts item_id absent
// usage: inventory::mint(user_storage, my_id, 10, ctx)
// usage: inventory::get(user_storage, my_id): u64
```

#### `offchain` (optional, default: `false`)

When `true`, writes emit an event but do not persist state. Only `set` is generated
(no `get` / `has`). Saves gas for data consumed only by the off-chain indexer.

> **Privacy:** `offchain: true` provides no privacy. The calldata is visible on-chain.

---

### Resource annotations

All annotation-generated functions are `public(package)`. Call them from your
system functions where you add guards, pause checks, and custom logic.

#### `fungible: true`

Generates `add` and `sub` in addition to `set`. Requires exactly one numeric value
field. `sub` aborts if amount exceeds the current balance.

```typescript
gold: { fields: { amount: 'u64' }, fungible: true }
```

```move
public(package) fun add(user_storage: &mut UserStorage, amount: u64, ctx: &mut TxContext)
public(package) fun sub(user_storage: &mut UserStorage, amount: u64, ctx: &mut TxContext)
```

#### `reactive: true`

Generates cross-user write variants. The caller must hold a `ScenePermit` that covers
both the writer (`from`) and the target user. The framework verifies participation
before allowing the write — use this for mechanics like combat damage.

```typescript
hp: { fields: { current: 'u64', max: 'u64' }, reactive: true }
```

```move
// Full-record cross-user write (generated when >1 value field)
public(package) fun set_reactive(
    scene_id: &sui::object::UID,
    meta:     &dubhe::dapp_service::PermitMetadata,
    from:     &mut UserStorage,
    target:   &mut UserStorage,
    current: u64, max: u64,
    ctx:     &mut TxContext,
)
// Per-field variants always generated:
public(package) fun set_current_reactive(scene_id, meta, from, target, current, ctx)
public(package) fun set_max_reactive(scene_id, meta, from, target, max, ctx)
```

> The `meta` argument comes from `permit::meta(&scene_permit)`, which returns
> `&PermitMetadata` containing the participant list and expiry.

#### `transferable: true`

For each `objects` or `scenes` entry that declares `accepts: ['<resourceName>']`,
generates a pair of bidirectional transfer functions in the resource module.

```typescript
gold: { fields: { amount: 'u64' }, fungible: true, transferable: true }
// objects: { guild: { accepts: ['gold'] } }
```

Generated in `gold.move`:

```move
public(package) fun transfer_user_to_guild(user, target, amount, ctx)
public(package) fun transfer_guild_to_user(source, user, amount, ctx)
```

For a keyed (non-fungible) resource, transfers the specific item by key:

```move
public(package) fun transfer_user_to_guild(user, target, item_id, ctx)
public(package) fun transfer_guild_to_user(source, user, item_id, ctx)
```

> `User → User` direct transfers are intentionally not generated to prevent griefing.

#### `listable: true`

Generates marketplace helpers. Works with both fungible and keyed resources.
The `CoinType` parameter accepts any token type.

```typescript
weapon: {
  fields: { item_id: 'u64', damage: 'u32' },
  keys: ['item_id'],
  listable: true,
}
```

Generated:

```move
public(package) fun list<CoinType>(user_storage, item_id, price, listed_until, ctx)
public(package) fun buy<CoinType>(dh, dapp_storage, listing, user_storage, payment, ctx): Coin<CoinType>
public(package) fun cancel_listing<CoinType>(listing, user_storage, ctx)
public(package) fun expire_listing<CoinType>(listing, user_storage, ctx)
```

`list` atomically removes the item from `UserStorage` into a `Listing` shared object.
`buy` transfers the item to the buyer's `UserStorage` and sends payment to the seller.
Move's linear types guarantee the item exists in exactly one place at a time.

---

## `objects` — DApp-owned named shared objects

Each `objects` entry generates an `ObjectStorage<MarkerType>` module.

```typescript
objects: {
  guild: {
    fields:      { level: 'u32', name: 'String' },
    accepts:     ['gold', 'weapon'],
    acceptsFrom: ['dungeon_run'],
    adminOnly:   true,
  }
}
```

- **`fields`** — metadata fields; generates `get_<field>` (public) and
  `set_<field>` (`public(package)`) on `ObjectStorage<Guild>`
- **`accepts`** — resources stored inside; generates bag accessors:
  - Fungible: `get_<resource>`, `add_<resource>`, `sub_<resource>`
  - Keyed: `has_<resource>`, `get_<resource>_data`, `set_<resource>_data`
    (aborts with `EDuplicateItemId` on duplicate key), `remove_<resource>_data`
- **`acceptsFrom`** — objects/scenes that can transfer into this object;
  generates `transfer_<source>_to_<dest>_<resource>` (all `public(package)`)
  in the destination module
- **`adminOnly: true`** — `create_<obj>` asserts `ctx.sender() == dapp_admin`

Generated lifecycle functions:

```move
// Creates and shares the ObjectStorage; entity_id is unique per object type
public fun create_<obj>(dapp_storage: &mut DappStorage, entity_id: vector<u8>, ctx: &mut TxContext)
// Destroys the ObjectStorage (bag must be empty)
public fun destroy_<obj>(dapp_storage: &mut DappStorage, storage: ObjectStorage<Guild>, ctx: &TxContext)

// ID helpers
public fun entity_id(storage: &ObjectStorage<Guild>): vector<u8>
public fun assert_<obj>_id(storage: &ObjectStorage<Guild>, expected: vector<u8>)
```

---

## `permits` — ScenePermit objects

Each `permits` entry generates a `ScenePermit<MarkerType>` module for participant
management. Permits serve as the authorization token for `reactive` writes and
permit-gated `scenes`. The `PermitConfig` body is currently empty (reserved).

```typescript
permits: {
  pvp_permit: {
  }
}
```

Generated functions:

```move
// Direct-invite creation (participants list fixed at creation)
public(package) fun new_pvp_permit(dapp_storage, participants, expires_at, max_participants, ctx): ScenePermit<PvpPermit>
public(package) fun create_pvp_permit(dapp_storage, participants, expires_at, max_participants, ctx)

// Open-invite creation (invitees must call accept)
public(package) fun new_pvp_permit_with_invitations(...)
public(package) fun create_pvp_permit_with_invitations(...)
public(package) fun accept_pvp_permit(permit, ctx)    // invitee accepts

// Dynamic participation
public(package) fun join_pvp_permit(permit, ctx)
public(package) fun leave_pvp_permit(permit, ctx)
public(package) fun expire_pvp_permit(permit, ctx)   // destroys expired permit
public(package) fun share_pvp_permit(permit)          // makes it shared

// Accessors
public fun meta(permit): &PermitMetadata
public fun is_active(permit, now_ms): bool
public fun is_participant(permit, addr): bool
```

To use a permit as authorization for `reactive` writes, pass `permit::meta(&permit)`
as the `meta` argument.

---

## `scenes` — multi-user scene shared objects

Each `scenes` entry generates a `SceneStorage<MarkerType>` module for multi-user
time-bounded interactions.

```typescript
scenes: {
  dungeon_run: {
    fields:        { floor: 'u32', boss_id: 'u64' },
    authorization: { kind: 'permit', permit: 'dungeon_permit' },
    accepts:       ['gold', 'loot'],
    acceptsFrom:   ['pvp_match'],
  }
}
```

### `authorization` (required)

Specifies who may write to scene fields:

- **`{ kind: 'permit', permit: '<permitName>' }`** — `set_<field>` requires a
  `&ScenePermit<MarkerType>` and `&TxContext`. Bag write accessors also require the
  permit + ctx. The framework verifies the caller is an active participant.
- **`{ kind: 'system' }`** — `set_<field>` takes only `(storage, value)` with no
  permit or context; callable directly from any function in your package.

### `fields`, `accepts`, `acceptsFrom`

Same semantics as `objects`.

### Scene lifecycle

Function names depend on the `authorization` kind:

**`{ kind: 'system' }` — system-authorized:**

```move
// Returns unshared SceneStorage (populate fields before sharing)
public(package) fun new_<scene>_system(dapp_storage: &DappStorage, ctx: &mut TxContext): SceneStorage<Marker>
// Creates and immediately shares
public(package) fun create_<scene>_system(dapp_storage: &DappStorage, ctx: &mut TxContext)
// Share an unshared SceneStorage
public(package) fun share_<scene>(storage: SceneStorage<Marker>)
// Destroy (bag must be empty)
public(package) fun destroy_<scene>(storage: SceneStorage<Marker>)
```

**`{ kind: 'permit', permit: '...' }` — permit-authorized:**

```move
public(package) fun new_<scene>_with_permit(dapp_storage: &DappStorage, permit: &ScenePermit<P>, ctx: &mut TxContext): SceneStorage<Marker>
public(package) fun create_<scene>_with_permit(dapp_storage: &DappStorage, permit: &ScenePermit<P>, ctx: &mut TxContext)
public(package) fun share_<scene>(storage: SceneStorage<Marker>)
public(package) fun destroy_<scene>(storage: SceneStorage<Marker>)
```

---

## `enums` (optional)

Define custom enum types for use as field or key types.

```typescript
enums: {
  Class: ['Warrior', 'Mage', 'Rogue'];
}
// Reference in resources: fields: { class: 'Class' }
```

---

## `errors` (optional)

Error constants with readable messages:

```typescript
errors: {
  player_not_found: 'Player does not exist',
  no_permission:    { message: 'No permission' },  // object form (equivalent)
}
// generates:
// public fun player_not_found_error(condition: bool) { assert!(condition, ...) }
```

---

## Complete example

```typescript
import { defineConfig } from '@0xobelisk/sui-common';

export const dubheConfig = defineConfig({
  name: 'mygame',
  description: 'An on-chain RPG',

  enums: { Class: ['Warrior', 'Mage', 'Rogue'] },

  resources: {
    // Global config
    server_config: { global: true, fields: { max_level: 'u32', base_hp: 'u64', admin: 'address' } },

    // Per-player character
    character: { fields: { class: 'Class', hp: 'u64', level: 'u32' } },

    // Fungible gold — transferable to guild
    gold: { fields: { amount: 'u64' }, fungible: true, transferable: true },

    // Weapon items — keyed, market-listed
    weapon: {
      fields: { item_id: 'u64', damage: 'u32' },
      keys: ['item_id'],
      transferable: true,
      listable: true
    },

    // HP — reactive for combat
    combat_hp: { fields: { current: 'u64', max: 'u64' }, reactive: true },

    // Off-chain position — gas-efficient movement tracking
    position: { fields: { x: 'u32', y: 'u32' }, offchain: true }
  },

  objects: {
    guild: {
      fields: { level: 'u32', name: 'String' },
      accepts: ['gold', 'weapon'],
      adminOnly: true
    }
  },

  permits: {
    pvp_permit: {}
  },

  scenes: {
    pvp_match: {
      fields: { round: 'u32', map_id: 'u64' },
      authorization: { kind: 'permit', permit: 'pvp_permit' },
      accepts: ['weapon']
    }
  },

  errors: {
    player_not_found: 'Player does not exist',
    max_level_reached: 'Already at max level',
    insufficient_gold: 'Not enough gold'
  }
});
```
