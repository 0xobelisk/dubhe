# Dubhe 存储模型扩展：配置关键词完整指南

> 本文档介绍 Dubhe 框架新增的存储扩展能力，包括 `resources` 层的全部注解关键词，以及 `objects` / `scenes` 两个新的存储配置段。

---

## 背景

原有的 `UserStorage`（每用户一个 Shared Object）只能存储单玩家状态。多人对战、公会金库、副本共享状态等场景，需要不同粒度的存储对象。新设计通过 `dubhe.config.ts` 配置驱动 codegen，自动生成类型安全的 Move 模块，开发者专注于游戏逻辑即可。

---

## 一、存储类型总览

| 配置段                        | 生成存储类型                           | 归属      | 典型用途             |
| ----------------------------- | -------------------------------------- | --------- | -------------------- |
| `resources`                   | `UserStorage` 内的记录                 | 单个用户  | 玩家金币、血量、背包 |
| `resources`（`global: true`） | `DappStorage` 内的记录                 | 全局 DApp | 全服配置、排行榜     |
| `objects`                     | `ObjectStorage`（typed Shared Object） | DApp 控制 | 公会金库、Boss 状态  |
| `scenes`                      | `SceneStorage`（typed Shared Object）  | 临时场景  | PvP 对局、副本进度   |

---

## 二、resources 关键词详解

`resources` 中每个条目默认生成写入 `UserStorage` 的 CRUD 函数。以下关键词可单独或组合使用，扩展生成的接口能力。

### 基础结构

```typescript
resources: {
  hp: {
    fields: { current: 'u64', max: 'u64' },  // 必填：字段定义
    keys:   ['player'],                        // 可选：指定哪些字段作为复合主键
  }
}
```

**生成的基础函数（所有 resource 共有）：**

```move
// 存在性检查
public fun has(user_storage: &UserStorage, ...keys): bool
public fun ensure_has(user_storage: &UserStorage, ...keys)
public fun ensure_has_not(user_storage: &UserStorage, ...keys)

// 读取（单值字段时为 get，多值时为 get + get_<field>）
public fun get(user_storage: &UserStorage, ...keys): (T1, T2, ...)
public fun get_<field>(user_storage: &UserStorage, ...keys): T

// 写入（需要在同包内调用，防止外部绕过）
public(package) fun set(user_storage: &mut UserStorage, ...keys, ...values, ctx)
public(package) fun set_<field>(user_storage: &mut UserStorage, ...keys, value, ctx)

// 删除
public(package) fun delete(user_storage: &mut UserStorage, ...keys, ctx)

// BCS 编解码（供跨存储转移使用）
public fun encode(...): vector<vector<u8>>
public fun decode(data: vector<u8>): Struct
```

---

### `global: true` — 存入 DappStorage

```typescript
resources: {
  server_config: {
    fields: { max_players: 'u64', version: 'u32' },
    global: true,
  }
}
```

数据写入全局共享的 `DappStorage`，而非每个玩家的 `UserStorage`。适用于全服配置、合约版本号等。生成函数签名中存储参数从 `user_storage: &UserStorage` 改为 `dapp_storage: &DappStorage`。

---

### `offchain: true` — 链下存储标记

```typescript
resources: {
  player_position: {
    fields: { x: 'u32', y: 'u32' },
    offchain: true,
  }
}
```

数据**不写入链上状态**，只生成 `set`（不含 `get` / `has`），适用于位置、动画帧、日志等无需合约内读取的数据。主要作用是**节省 Gas**（省去状态写入费用），并通过链下索引服务订阅事件来追踪数据。

> **注意**：`offchain: true` 不提供任何隐私保护。交易的 calldata 在链上完全公开，任何人都能从交易记录中解析出传入的参数值。如果需要隐藏用户坐标等敏感数据，应在客户端提交前加密，或完全不上链、由游戏服务器管理。

---

### `fungible: true` — 同质化资产

```typescript
resources: {
  gold: {
    fields: { amount: 'u64' },
    fungible: true,
  }
}
```

**额外生成：**

```move
// 安全加减（sub 不足时 abort）
public(package) fun add(user_storage: &mut UserStorage, amount: u64, ctx: &mut TxContext)
public(package) fun sub(user_storage: &mut UserStorage, amount: u64, ctx: &mut TxContext)

// 错误常量
const EInsufficientAmount: vector<u8> = b"Insufficient amount";
```

`sub` 在余额不足时链上 abort，不会出现负余额。

> **约束**：`fungible: true` 要求 `fields` 中只有一个数值字段。

---

### `unique: true` + `keys` — 非同质化资产（NFT 类）

```typescript
resources: {
  weapon: {
    fields: { item_id: 'u64', damage: 'u32', rarity: 'u8' },
    unique: true,
    keys: ['item_id'],   // 指定哪个字段是 item ID
  }
}
```

**额外生成：**

```move
// 自动分配 ID 后铸造，ensure_has_not 防止重复
public(package) fun mint(
    user_storage: &mut UserStorage,
    damage: u32,
    rarity: u8,
    ctx: &mut TxContext,
): u64   // 返回自动生成的 item_id
```

`mint` 用 `ctx.fresh_object_address()` 生成全局唯一的 `item_id`，写入前断言该 ID 在此 storage 中不存在，避免静默覆盖。

> **与普通 `set` 的区别**：普通 `set` 允许覆盖已有记录（更新语义）；`unique` 的 `mint` 断言不存在（新增语义）。一个玩家可以持有多把武器，每把有独立 `item_id`。

---

### `reactive: true` — 跨用户响应式写入

```typescript
resources: {
  hp: {
    fields: { current: 'u64', max: 'u64' },
    reactive: true,
  }
}
```

**额外生成：**

```move
// 整条记录的跨用户写入（多值字段时生成）
public(package) fun set_reactive(
    meta:   &SceneMetadata,   // 必须持有同一 SceneStorage 的 meta 引用
    from:   &mut UserStorage, // 发起方（必须是 meta.participants 之一）
    target: &mut UserStorage, // 目标方（必须是 meta.participants 之一）
    current: u64,
    max:     u64,
    ctx:     &mut TxContext,
)

// 单字段变体（每个非 key 字段单独生成）
public(package) fun set_current_reactive(meta, from, target, current, ctx)
public(package) fun set_max_reactive(meta, from, target, max, ctx)
```

**安全机制**：`set_record_reactive` / `set_field_reactive` 内部验证：

1. `from` 的 canonical_owner == `ctx.sender()`（防止代发）
2. `ctx.sender()` 必须在 `meta.participants` 中
3. `target` 的 canonical_owner 也必须在 `meta.participants` 中

不在同一场景的两个用户之间无法触发 reactive write，从根本上消除对任意玩家的 griefing 攻击。

> **keyed + reactive 组合**：若同时有 `keys`，则 `set_reactive` 不生成（只有一个非 key 值字段时无意义），只生成 `set_<field>_reactive` 单字段变体。

---

### `transferable: true` — 跨存储转移

```typescript
resources: {
  gold: { fields: { amount: 'u64' }, fungible: true, transferable: true },
}
objects: {
  guild: { fields: { level: 'u32' }, accepts: ['gold'] }
}
```

`transferable: true` 配合 `objects`/`scenes` 中的 `accepts` 声明，在**资源模块**（`gold.move`）中生成双向转移函数：

**Fungible 版本：**

```move
// UserStorage → GuildStorage
public(package) fun transfer_user_to_guild(
    user:   &mut UserStorage,
    target: &mut guild::GuildStorage,
    amount: u64,
    ctx:    &mut TxContext,
)

// GuildStorage → UserStorage
public(package) fun transfer_guild_to_user(
    source: &mut guild::GuildStorage,
    user:   &mut UserStorage,
    amount: u64,
    ctx:    &mut TxContext,
)
```

**Unique 版本（按 item_id 转移单件）：**

```move
public(package) fun transfer_user_to_guild(
    user:    &mut UserStorage,
    target:  &mut guild::GuildStorage,
    item_id: u64,
    ctx:     &mut TxContext,
)

public(package) fun transfer_guild_to_user(
    source:  &mut guild::GuildStorage,
    user:    &mut UserStorage,
    item_id: u64,
    ctx:     &mut TxContext,
)
```

同样支持 `User ↔ SceneStorage` 方向，对每个声明了 `accepts: ['gold']` 的 object 或 scene 分别生成一对函数。

> **注意**：`scene → user` 方向故意不检查场景是否已过期，防止资产因场景超时而被永久锁住。

> **用户间直接转账被禁止**：`transferable` 只生成 `User ↔ Object` 和 `User ↔ Scene` 方向，**不生成 `User → User` 方向**。这是有意的设计决策：UserStorage 是 Shared Object，若允许任意地址直接写入他人的 UserStorage，攻击者可以不断向目标玩家写入垃圾数据，消耗其存储或阻塞其操作（griefing 攻击）。需要玩家间资产流转时，应通过 DApp 自己管理的中间存储（如 ObjectStorage 收件箱、SceneStorage 托管）来实现。

---

### `listable: true` — 内置市场协议

```typescript
resources: {
  weapon: {
    fields: { item_id: 'u64', damage: 'u32', rarity: 'u8' },
    unique: true,
    keys:   ['item_id'],
    listable: true,
  }
}
```

**额外生成（unique 版本）：**

```move
// 卖家：将 weapon 从 UserStorage 原子取出，创建 Listing 共享对象
public entry fun list(
    user_storage: &mut UserStorage,
    item_id:      u64,
    price:        u64,
    listed_until: Option<u64>,   // None = 永不过期
    ctx:          &mut TxContext,
)

// 买家：支付 SUI，weapon 原子转入买家的 UserStorage
public entry fun buy(
    listing:      Listing,
    user_storage: &mut UserStorage,
    payment:      Coin<SUI>,
    ctx:          &mut TxContext,
)

// 卖家：撤回上架，weapon 回到自己的 UserStorage
public entry fun cancel_listing(
    listing:      Listing,
    user_storage: &mut UserStorage,
    ctx:          &TxContext,
)

// 任何人：清理已过期的 Listing，weapon 归还卖家
public entry fun expire_listing(
    listing:      Listing,
    user_storage: &mut UserStorage,
    ctx:          &TxContext,
)
```

`Listing` 是框架提供的共享对象，持有 BCS 编码的 `record_data`、`seller`、`price`、`listed_until`。Move 线性类型保证：武器在 `UserStorage` 和 `Listing` 之间只能存在于一处，不会复制。

> **fungible 版本**：上架指定 `amount`，买家一次性购买该数量。

---

## 三、objects 关键词详解

`objects` 段声明 DApp 控制的命名实体，每个条目生成一个 `<key>Storage` typed Shared Object 模块。

```typescript
objects: {
  guild: {
    fields:      { level: 'u32', name: 'String' },  // 对象自身字段
    accepts:     ['gold', 'weapon'],                  // 可存入的资源
    acceptsFrom: ['dungeon_run'],                     // 可从哪些 object/scene 接收转移
    adminOnly:   true,                                // 只有 admin 能创建（可选）
  }
}
```

### `fields` — 对象自身字段

生成 `get_<field>` / `set_<field>` Bag 访问器。字段存储在对象的 `Bag` 中（key = 字段名的 bytes）。

### `accepts: [...]` — 声明接受哪些资源

对每个被 `accepts` 的资源，在本模块（`guild.move`）生成该资源在此 Bag 内的访问器：

- Fungible 资源 → `get_gold / add_gold / sub_gold`
- Unique 资源 → `has_weapon / get_weapon_data / set_weapon_data / remove_weapon_data`

### `acceptsFrom: [...]` — 跨存储接收转移

声明本对象可以从哪些 object 或 scene 直接接收转移。codegen 计算：

```
生成函数对应的资源 = source.accepts ∩ this.accepts
```

在本模块生成：

```move
// guild.move — 接受来自 dungeon_run scene 的 gold
use mygame::dungeon_run::{Self, DungeonRunStorage};

public(package) fun transfer_dungeon_run_to_guild_gold(
    from:   &mut DungeonRunStorage,
    to:     &mut GuildStorage,
    amount: u64,
) {
    dungeon_run::sub_gold(from, amount);
    add_gold(to, amount);
}
```

函数可见性为 `public(package)`，只有同包的 system 函数可以调用，外部无法绕过游戏逻辑直接转移。

### `adminOnly: true` — 创建权限限制

在 `create_<obj>` 入口函数头部插入：

```move
assert!(ctx.sender() == dubhe::dapp_service::dapp_admin(dapp_storage), ENoPermission);
```

适用于 Boss、赛季对象等需要运营方控制创建时机的实体。

### entity_id 唯一性保证

每个 `ObjectStorage` 在 `DappStorage` 中注册 `(type_tag, entity_id) → object_id`，同一类型下重复的 `entity_id` 会链上 abort：

```move
public fun assert_guild_id(storage: &GuildStorage, expected: vector<u8>) {
    assert!(storage.entity_id == expected, EWrongEntityId);
}
```

---

## 四、scenes 关键词详解

`scenes` 段声明临时或持久的多人场景，每个条目生成一个 `<key>Storage` typed Shared Object 模块，内嵌 `SceneMetadata`（参与者列表 + 过期时间）。

```typescript
scenes: {
  pvp_match: {
    fields:      { round: 'u32', map_id: 'u64' },
    accepts:     ['loot'],
    acceptsFrom: ['dungeon_run'],
  }
}
```

### `fields` — 场景自身字段

同 objects，生成 `get_<field>` / `set_<field>`。

### `accepts` / `acceptsFrom`

逻辑与 objects 完全相同，区别仅在于生成的目标存储类型是 `SceneStorage`。

### 生命周期入口函数（框架固定生成）

#### 链下多签创建

玩家在**链下**签名同意后，服务端提交一笔交易创建场景，避免 admin 单方面为任意玩家开启对局：

```move
public entry fun create_<scene>_with_consent(
    dapp_storage: &mut DappStorage,
    participants: vector<address>,    // 参与者地址列表（支持 N 个）
    sigs:         vector<vector<u8>>, // 每人一个 ed25519 签名
    pubkeys:      vector<vector<u8>>, // 对应公钥
    nonce:        u64,                // 防重放 nonce
    expires_at:   u64,                // 场景过期时间（ms）
    ctx:          &mut TxContext,
)
```

链上验证流程：

1. `consume_nonce` — 将 nonce 写入 `DappStorage`，重复提交会 abort
2. `ed25519_verify` — 逐一验证每个参与者的签名
3. 验证通过后创建场景，`participants` 写入 `SceneMetadata`

#### 动态加入（开放场景）

```move
public entry fun join_<scene>(storage: &mut SceneStorage, ctx: &mut TxContext)
```

无需签名，适用于公开副本大厅等场景，但要求场景未过期。

#### 销毁场景

```move
public entry fun expire_<scene>(storage: SceneStorage, ctx: &TxContext)
```

要求场景已过期（`expires_at < now_ms`）且 `Bag` 为空。**若场景内仍有资产，必须先转移清空**，框架不会自动退还。

---

## 五、完整配置速查

```typescript
export default defineConfig({
  name: 'mygame',

  resources: {
    // ── 同质化资产 ─────────────────────────────────────────────────────────
    gold: {
      fields: { amount: 'u64' },
      fungible: true, // 生成 add / sub
      transferable: true // 生成 transfer_user_to_X / transfer_X_to_user
    },

    // ── 非同质化资产 ───────────────────────────────────────────────────────
    weapon: {
      fields: { item_id: 'u64', damage: 'u32', rarity: 'u8' },
      unique: true, // 生成 mint（自动 ID，断言不存在）
      keys: ['item_id'], // item_id 作为主键
      transferable: true, // 生成跨存储转移
      listable: true // 生成 list / buy / cancel_listing / expire_listing
    },

    // ── 跨用户响应式写入 ───────────────────────────────────────────────────
    hp: {
      fields: { current: 'u64', max: 'u64' },
      reactive: true // 生成 set_reactive / set_<field>_reactive
    },

    // ── keyed + reactive 组合 ──────────────────────────────────────────────
    buff: {
      fields: { player: 'address', value: 'u32' },
      keys: ['player'], // player 是主键，value 是数据
      reactive: true // 生成 set_value_reactive（单字段变体）
    },

    // ── 链下数据（不存链上状态）───────────────────────────────────────────
    position: {
      fields: { x: 'u32', y: 'u32' },
      offchain: true // 只生成 set，不生成 get/has
    },

    // ── 全服配置（写入 DappStorage）───────────────────────────────────────
    season_config: {
      fields: { season_id: 'u32', end_time: 'u64' },
      global: true // 写入 DappStorage 而非 UserStorage
    }
  },

  objects: {
    guild: {
      fields: { level: 'u32', name: 'String' },
      accepts: ['gold', 'weapon'], // 接受 gold 和 weapon 存入
      acceptsFrom: ['dungeon_run'], // 接受来自 dungeon_run 的转移
      adminOnly: true // 只有 admin 能创建
    }
  },

  scenes: {
    pvp_match: {
      fields: { round: 'u32', map_id: 'u64' },
      accepts: ['loot']
    },
    dungeon_run: {
      fields: { floor: 'u32', boss_id: 'u64' },
      accepts: ['gold', 'loot'],
      acceptsFrom: ['pvp_match'] // 接受来自 pvp_match 的 loot 转移
    }
  }
});
```

### 关键词汇总表

| 关键词               | 适用层                                | 生成内容                                                                          |
| -------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| `fields`             | resource / object / scene             | 基础字段声明，必填                                                                |
| `keys: [...]`        | resource                              | 指定复合主键字段，其余字段为值字段                                                |
| `global: true`       | resource                              | 存储目标从 `UserStorage` 改为 `DappStorage`                                       |
| `offchain: true`     | resource                              | 仅生成 `set`，不生成 `get` / `has`（节省 Gas，数据由链下索引消费）                |
| `fungible: true`     | resource                              | 追加 `add` / `sub` 安全加减                                                       |
| `unique: true`       | resource（需配合 `keys`）             | 追加 `mint`（自动 ID，断言不存在）                                                |
| `reactive: true`     | resource                              | 追加 `set_reactive` / `set_<field>_reactive`（需 SceneMetadata 授权）             |
| `transferable: true` | resource                              | 为每个 `accepts` 本资源的 object/scene 生成双向 transfer 函数（在 resource 模块） |
| `listable: true`     | resource（需 `unique` 或 `fungible`） | 追加 `list` / `buy` / `cancel_listing` / `expire_listing`                         |
| `accepts: [...]`     | object / scene                        | 生成指定资源的 Bag 访问器（get/add/sub 或 has/get_data/set_data/remove_data）     |
| `acceptsFrom: [...]` | object / scene                        | 生成 `transfer_<source>_to_<dest>_<resource>` 跨存储函数（在目标模块）            |
| `adminOnly: true`    | object                                | `create_<obj>` 入口校验 `ctx.sender() == dapp_admin`                              |

---

## 六、游戏场景覆盖

### 场景 1：公会金库

| 操作             | 调用                                                                |
| ---------------- | ------------------------------------------------------------------- |
| 玩家捐献金币     | `gold::transfer_user_to_guild(user, guild, amount, ctx)`            |
| 副本结算自动入库 | `guild::transfer_dungeon_run_to_guild_gold(dungeon, guild, amount)` |
| 公会发放奖励     | `gold::transfer_guild_to_user(guild, user, amount, ctx)`            |
| 玩家存入武器     | `weapon::transfer_user_to_guild(user, guild, item_id, ctx)`         |

### 场景 2：PvP 对局（三角洲行动模式）

```
① 服务端收集双方签名 → 提交一笔 tx → create_pvp_match_with_consent
② 玩家带装备入场（可选）：weapon::transfer_user_to_pvp_match(user, match, item_id, ctx)
③ 双方攻击：hp::set_reactive(&match.meta, &mut from_us, &mut target_us, ...)
④ 战利品掉落：pvp_match::add_loot(match, amount)
⑤ 存活玩家撤出装备和战利品：
     weapon::transfer_pvp_match_to_user(match, user, item_id, ctx)
     loot::transfer_pvp_match_to_user(match, user, amount, ctx)
⑥ 对局结束（Bag 清空后）：pvp_match::expire_pvp_match(match, ctx)
```

> 死亡玩家无法撤出——DApp system 函数自行决定哪些玩家有权调用 `transfer_pvp_match_to_user`（例如仅存活玩家）。未被取走的物品留在场景 Bag 中，场景不会被销毁，直到 DApp 处理完毕。

### 场景 3：副本 + 公会联动

```
副本开始：create_dungeon_run_with_consent(participants=[A,B], ...)
    ↓
副本内：dungeon_run::add_gold(dungeon, boss_reward)
    ↓
结算：guild::transfer_dungeon_run_to_guild_gold(dungeon, guild, amount)
    ↓
副本销毁：dungeon_run::expire_dungeon_run(dungeon, ctx)
```

### 场景 4：NFT 武器市场

```
铸造：weapon::mint(user, damage=500, rarity=3, ctx) → item_id
上架：weapon::list(user, item_id, price=1_000_000_000, listed_until=none, ctx)
购买：weapon::buy(listing, buyer_user, payment, ctx)
取消：weapon::cancel_listing(listing, user, ctx)
```

### 场景 5：keyed Buff 系统（跨用户施法）

```typescript
// config
buff: { fields: { player: 'address', value: 'u32' }, keys: ['player'], reactive: true }
```

```move
// system 函数：法师给队友加 buff（双方都在同一副本 meta 里）
buff::set_value_reactive(&dungeon.meta, &mut caster_us, &mut target_us, player_addr, 50, ctx);
```

### 场景 6：全服排行榜（global）

```typescript
// config
rank_score: { fields: { score: 'u64' }, global: true }
```

```move
// 写入全服排行分（无需 TxContext）
rank_score::set(dapp_storage, 9999);
// 读取
let score = rank_score::get(dapp_storage);
```

### 场景 7：位置追踪（offchain，节省 Gas）

```typescript
// config
position: { fields: { x: 'u32', y: 'u32' }, offchain: true }
```

```move
// 不写链上状态，只发事件供链下索引服务消费
// 注意：坐标值在 calldata 中仍然公开可见
position::set(user_storage, 42, 88, ctx);
```

---

### 场景 8：开放式公开房间（join 模式）

某些场景不需要所有参与者提前签名（例如公开副本大厅、公开 PvP 竞技场），可以先由 admin 或第一个玩家创建场景，后续玩家通过 `join_<scene>` 自由加入：

```
① admin 预先创建场景（可用 adminOnly object 也可用一次多签）
② 后续玩家自由加入：dungeon_run::join_dungeon_run(dungeon, ctx)
③ 加入后 ctx.sender() 即成为 participants 之一，可触发 reactive write
```

**与 `create_with_consent` 的区别**：

|             | `create_with_consent`       | `join_<scene>`                                    |
| ----------- | --------------------------- | ------------------------------------------------- |
| 适用        | 双方/多方均需提前同意的对局 | 公开场景，随时加入                                |
| 创建时机    | 所有参与者签名后一次性创建  | 先创建空场景，后逐步加入                          |
| 参与者      | 创建时全部确定              | 加入时动态追加                                    |
| 反 griefing | 签名验证，不可伪造          | 任何人可加入，DApp 需自行在 system 函数中控制准入 |

---

### 场景 9：玩家间赠送（通过中间存储）

`UserStorage → UserStorage` 直接转账被禁止（防 griefing）。正确做法是通过 DApp 管理的中间存储：

```
Alice 赠送 gold 给 Bob：
  ① Alice 将 gold 转入 DApp 控制的 GiftBox ObjectStorage：
       gold::transfer_user_to_giftbox(alice_us, giftbox, amount, ctx)
  ② Bob 从 GiftBox 提取：
       gold::transfer_giftbox_to_user(giftbox, bob_us, amount, ctx)
     （DApp system 函数负责校验 giftbox 的 recipient 字段 == ctx.sender()）
```

这样 Alice 无法强制修改 Bob 的存储，Bob 需要主动触发提取（pull 模式），双方都有明确的链上操作记录。

---

## 七、框架层变更概要

| 模块                | 变更                                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| `dapp_service.move` | `add/remove_scene_participant` 改为 `public`，允许跨包调用                  |
| `dapp_system.move`  | 新增 `register_object_entity` / `unregister_object_entity`（解耦 UID 创建） |
| `dapp_system.move`  | 新增 `consume_nonce`（链下多签防重放）                                      |
| `dapp_system.move`  | 新增 `new_scene_meta`（测试辅助函数）                                       |

> **Sui UID freshness 规则**：`ObjectStorage` 的 UID 必须在 codegen 生成的 `create_<obj>` 函数内本地创建（`sui::object::new(ctx)`），框架只提供 `register_object_entity` 做注册侧的簿记，绕不开此限制。

---

## 八、测试覆盖

```bash
# Schemagen 单元测试（验证所有关键词生成正确代码）
cd e2e && pnpm test:schemagen   # 130 tests

# Move 编译 + 单元测试（含 guild 综合包）
cd e2e && pnpm test:move        # 9 test suites
```

| 套件                      | 覆盖内容                                                               |
| ------------------------- | ---------------------------------------------------------------------- |
| `annotations.test.ts`     | fungible / unique / reactive / transferable / listable / reactive+keys |
| `objects.test.ts`         | accepts fungible/unique、adminOnly、acceptsFrom（fungible + 空交集）   |
| `scenes.test.ts`          | accepts fungible/unique、acceptsFrom（fungible + unique）              |
| `validate-config.test.ts` | accepts/acceptsFrom 引用不存在资源时报错                               |
| `guild` Move package      | 所有注解在真实 Move 编译器下通过，5 个运行时测试                       |
| Framework Move tests      | SceneMetadata 参与者管理、过期检查（267 tests）                        |
