# @0xobelisk/sui-common

Dubhe 框架的底层公共逻辑包。提供 `schemagen` 代码生成器（供 CLI 调用）、`DubheConfig` 类型定义，以及 CLI 和 SDK 共用的工具函数。

---

## 包导出结构

```
@0xobelisk/sui-common
├── codegen/          # schemagen —— 根据 DubheConfig 生成 Move 源文件
│   ├── types/        # DubheConfig、MoveType、Component 类型定义
│   └── utils/        # schemaGen() 入口 + 所有生成器模块
├── parseData/        # 运行时工具：解析链上 BCS 响应数据
└── primitives/       # SDK 使用的订阅类型枚举
```

---

## DubheConfig 完整参考

`DubheConfig` 是所有 Move 源文件的唯一配置来源。

```typescript
import { defineConfig } from '@0xobelisk/sui-common';

export const dubheConfig = defineConfig({
  name: 'my_project',           // Move 包名（snake_case）
  description: 'My description',
  enums: { ... },               // 可选：自定义枚举类型
  resources: { ... },           // 必填：数据 Schema 定义
  errors: { ... },              // 可选：自定义错误消息
});
```

### `name` / `description`

`name` 会成为 Move 包名和模块前缀，必须是合法的 Move 标识符（snake_case，不能含连字符）。

---

### `enums`

定义可在 resource 字段类型中使用的自定义枚举类型。

```typescript
enums: {
  Direction: ['North', 'East', 'South', 'West'],
  Status:    ['Missed', 'Caught', 'Fled'],
}
```

每个枚举会在 `sources/codegen/enums/<枚举名>.move` 生成一个 Move 模块，包含：

| 生成内容                              | 说明                                    |
| ------------------------------------- | --------------------------------------- |
| `public enum <Name>`                  | 带 `copy, drop, store` 能力的 Move 枚举 |
| `public fun new_<variant>()`          | 每个变体的构造函数                      |
| `public fun encode(self): vector<u8>` | BCS 序列化                              |
| `public fun decode(bytes: &mut BCS)`  | BCS 反序列化                            |

**生成示例：**

```move
module my_project::direction {
    public enum Direction has copy, drop, store { East, North, South, West }
    public fun new_east(): Direction { Direction::East }
    public fun encode(self: Direction): vector<u8> { to_bytes(&self) }
    public fun decode(bytes: &mut BCS): Direction { ... }
}
```

---

### `resources`

核心数据 Schema。`resources` 中的每个条目对应一个 Move 模块，生成到 `sources/codegen/resources/<名称>.move`。

#### 六种 Resource 模式

根据 `fields`、`keys`、`global`、`offchain` 的组合，共有 **六种** 模式。

---

##### 模式 1 —— 简写单值（entity 级存储）

最简单的形式：直接写一个原始类型或枚举类型字符串。值按 `resource_account`（实体地址）存储。

```typescript
resources: {
  health: 'u32',
  status: 'Status',   // 枚举类型
}
```

生成的 API：

```move
public fun has(dapp_hub: &DappHub, resource_account: String): bool
public fun ensure_has(dapp_hub: &DappHub, resource_account: String)
public fun ensure_has_not(dapp_hub: &DappHub, resource_account: String)
public(package) fun delete(dapp_hub: &mut DappHub, resource_account: String)
public fun get(dapp_hub: &DappHub, resource_account: String): u32
public(package) fun set(dapp_hub: &mut DappHub, resource_account: String, value: u32, ctx: &mut TxContext)
public fun encode(value: u32): vector<vector<u8>>
```

---

##### 模式 2 —— 多字段 entity 资源（无显式 keys）

`fields` 中没有设置 `keys`，只用 `resource_account` 作为存储键。这是 "component" 风格——每个实体（地址）拥有一条记录。

```typescript
resources: {
  stats: {
    fields: { attack: 'u32', hp: 'u32' }
  }
}
```

生成的 API：

```move
public fun has(dapp_hub: &DappHub, resource_account: String): bool
public fun ensure_has(dapp_hub: &DappHub, resource_account: String)
public fun ensure_has_not(dapp_hub: &DappHub, resource_account: String)
public(package) fun delete(dapp_hub: &mut DappHub, resource_account: String)
public fun get(dapp_hub: &DappHub, resource_account: String): (u32, u32)
public(package) fun set(dapp_hub: &mut DappHub, resource_account: String, attack: u32, hp: u32, ctx: &mut TxContext)
// 每个字段单独的 getter / setter：
public fun get_attack(dapp_hub: &DappHub, resource_account: String): u32
public(package) fun set_attack(dapp_hub: &mut DappHub, resource_account: String, attack: u32, ctx: &mut TxContext)
public fun get_hp(...): u32
public(package) fun set_hp(...)
// 结构体级别的 getter / setter：
public fun get_struct(dapp_hub: &DappHub, resource_account: String): Stats
public(package) fun set_struct(dapp_hub: &mut DappHub, resource_account: String, stats: Stats, ctx: &mut TxContext)
// 编解码：
public fun encode(attack: u32, hp: u32): vector<vector<u8>>
public fun encode_struct(stats: Stats): vector<vector<u8>>
public fun decode(data: vector<u8>): Stats
```

同时会生成 `Stats` 结构体（具有 `copy, drop, store` 能力），包含字段读写方法：
`public fun attack(self: &Stats): u32` 和 `public fun update_attack(self: &mut Stats, attack: u32)`。

---

##### 模式 3 —— 单值 keyed 资源

一个值字段 + 显式 `keys`，存储键为 `[TABLE_NAME, ...key_bytes]`。

```typescript
resources: {
  player_score: {
    fields: { player: 'address', score: 'u32' },
    keys: ['player']
  }
}
```

生成的 API（key 字段作为额外参数，排在 `resource_account` 之后）：

```move
public fun has(dapp_hub: &DappHub, resource_account: String, player: address): bool
public fun ensure_has(dapp_hub: &DappHub, resource_account: String, player: address)
public fun ensure_has_not(dapp_hub: &DappHub, resource_account: String, player: address)
public(package) fun delete(dapp_hub: &mut DappHub, resource_account: String, player: address)
public fun get(dapp_hub: &DappHub, resource_account: String, player: address): u32
public(package) fun set(dapp_hub: &mut DappHub, resource_account: String, player: address, score: u32, ctx: &mut TxContext)
public fun encode(value: u32): vector<vector<u8>>
```

---

##### 模式 4 —— 多字段 keyed 资源

多个值字段 + 显式 `keys`，除元组级的 `get`/`set` 外，还会生成各字段独立的 getter/setter。

```typescript
resources: {
  player_stats: {
    fields: { player: 'address', attack: 'u32', hp: 'u32' },
    keys: ['player']
  }
}
```

生成的 API：

```move
public fun has(..., player: address): bool
public fun ensure_has(..., player: address)
public fun ensure_has_not(..., player: address)
public(package) fun delete(..., player: address)
public fun get(..., player: address): (u32, u32)
public(package) fun set(..., player: address, attack: u32, hp: u32, ctx: &mut TxContext)
public fun get_attack(..., player: address): u32
public(package) fun set_attack(..., player: address, attack: u32, ctx: &mut TxContext)
// get_hp / set_hp 类似...
public fun get_struct(..., player: address): PlayerStats
public(package) fun set_struct(..., player: address, player_stats: PlayerStats, ctx: &mut TxContext)
public fun encode(...): vector<vector<u8>>
public fun encode_struct(...): vector<vector<u8>>
public fun decode(data: vector<u8>): PlayerStats
```

---

##### 模式 5 —— Global 单例资源

设置 `global: true` 后，以 `dapp_key::package_id()` 作为固定的 `resource_account`，API 中不再暴露 `resource_account` 参数。

```typescript
resources: {
  game_config: {
    global: true,
    fields: { max_players: 'u32', fee: 'u64' }
  }
}
```

生成的 API（无 `resource_account` 参数）：

```move
public fun has(dapp_hub: &DappHub): bool
public fun ensure_has(dapp_hub: &DappHub)
public fun ensure_has_not(dapp_hub: &DappHub)
public(package) fun delete(dapp_hub: &mut DappHub)
public fun get(dapp_hub: &DappHub): (u32, u64)
public(package) fun set(dapp_hub: &mut DappHub, max_players: u32, fee: u64, ctx: &mut TxContext)
// get_max_players / set_max_players / get_fee / set_fee ...
```

`global: true` 与显式 `keys` 可以同时使用，keys 仍然作为参数出现。

---

##### 模式 6 —— Offchain 资源

设置 `offchain: true` 后，所有读取函数（`get`、`get_*`、`get_struct`、`has`、`ensure_has`、`ensure_has_not`）都不会生成，只保留 `set` / `set_struct` / `encode` / `delete`。适用于数据由链外索引器读取的场景。

```typescript
resources: {
  event_log: {
    offchain: true,
    fields: { timestamp: 'u64', message: 'String' }
  }
}
```

---

#### `Component` 全部选项说明

```typescript
type Component = {
  fields: Record<string, MoveType>; // 必填：字段名 -> Move 类型
  keys?: string[]; // 可选：哪些字段参与存储键
  global?: boolean; // 可选：使用 package address 作为 resource_account
  offchain?: boolean; // 可选：不生成读取函数
};
```

---

### `errors`

自定义命名错误及其人类可读的消息。

```typescript
errors: {
  NotAuthorized: 'Caller is not authorized',
  ResourceNotFound: 'The requested resource does not exist',
}
```

生成 `sources/codegen/errors.move`：

```move
module my_project::errors {
    #[error]
    const NOTAUTHORIZED: vector<u8> = b"Caller is not authorized";
    public fun not_authorized_error(condition: bool) { assert!(condition, NOTAUTHORIZED) }

    #[error]
    const RESOURCENOTFOUND: vector<u8> = b"The requested resource does not exist";
    public fun resource_not_found_error(condition: bool) { assert!(condition, RESOURCENOTFOUND) }
}
```

---

## 支持的 Move 类型

| TypeScript 字符串      | Move 类型                           |
| ---------------------- | ----------------------------------- |
| `'address'`            | `address`                           |
| `'bool'`               | `bool`                              |
| `'u8'`                 | `u8`                                |
| `'u32'`                | `u32`                               |
| `'u64'`                | `u64`                               |
| `'u128'`               | `u128`                              |
| `'u256'`               | `u256`                              |
| `'String'`             | `std::ascii::String`                |
| `'vector<u8>'`         | `vector<u8>`                        |
| `'vector<u32>'`        | `vector<u32>`                       |
| `'vector<u64>'`        | `vector<u64>`                       |
| `'vector<u128>'`       | `vector<u128>`                      |
| `'vector<u256>'`       | `vector<u256>`                      |
| `'vector<address>'`    | `vector<address>`                   |
| `'vector<bool>'`       | `vector<bool>`                      |
| `'vector<vector<u8>>'` | `vector<vector<u8>>`                |
| `'<EnumName>'`         | 自定义枚举（必须在 `enums` 中声明） |

---

## schemagen 执行流程

`schemaGen(rootDir, config, network?)` 是 `dubhe schemagen` 命令调用的主入口，**按顺序**执行以下步骤：

```
schemagen
│
├── 1. 删除 sources/codegen/            （每次都清空重生成）
│
├── 2. Move.toml                         （仅首次生成，不覆盖）
│   └─ 锁定 Sui 和 Dubhe 的依赖版本
│
├── 3. sources/codegen/genesis.move      （仅首次生成，不覆盖）
│   └─ entry fun run()：注册 dapp + 调用 deploy_hook
│
├── 4. sources/codegen/init_test.move    （仅首次生成，不覆盖）
│   └─ deploy_dapp_for_testing()，用于 Move 单元测试
│
├── 5. sources/codegen/dapp_key.move     （仅首次生成，不覆盖）
│   └─ DappKey 结构体 + to_string() + package_id() + eq()
│
├── 6. sources/scripts/deploy_hook.move  （仅首次生成，不覆盖）
│   └─ 可编辑的钩子，由 genesis 调用，用于添加部署后初始化逻辑
│
├── 7. sources/codegen/resources/        （每次都重新生成）
│   └─ DubheConfig 中每个 resource 条目生成一个 .move 文件
│
├── 8. sources/codegen/enums/            （仅首次生成，不覆盖）
│   └─ DubheConfig 中每个 enum 条目生成一个 .move 文件
│
├── 9. sources/codegen/errors.move       （如果 config.errors 存在则生成）
│
├── 10. sources/systems/                 （目录不存在时创建，已存在不修改）
│    └─ 手写 system 业务逻辑的占位目录
│
├── 11. sources/tests/                   （目录不存在时创建，已存在不修改）
│    └─ 手写 Move 测试的占位目录
│
└── 12. sources/scripts/migrate.move    （仅首次生成，不覆盖）
     └─ ON_CHAIN_VERSION 常量，用于合约升级版本管理
```

**关键重生成规则：** 只有 `sources/codegen/resources/`（第 7 步）每次都会重新生成。其他所有文件只在不存在时才生成——**用户可编辑的文件永远不会被覆盖**。

---

## 生成文件目录结构

对名为 `my_project` 的项目执行 `dubhe schemagen` 后，目录结构如下：

```
src/my_project/
├── Move.toml
└── sources/
    ├── codegen/
    │   ├── genesis.move          # 自动生成，禁止手动编辑
    │   ├── init_test.move        # 自动生成，禁止手动编辑
    │   ├── dapp_key.move         # 自动生成，禁止手动编辑
    │   ├── errors.move           # 自动生成，禁止手动编辑
    │   ├── resources/
    │   │   ├── health.move       # 自动生成，禁止手动编辑
    │   │   └── stats.move        # 自动生成，禁止手动编辑
    │   └── enums/
    │       └── direction.move    # 自动生成，禁止手动编辑
    ├── scripts/
    │   ├── deploy_hook.move      # 可编辑：部署后初始化逻辑
    │   └── migrate.move          # 可编辑：升级版本跟踪
    ├── systems/                  # 可编辑：游戏 / 应用业务逻辑
    └── tests/                    # 可编辑：Move 单元测试
```

---

---

## Framework 架构解析

### 什么是 Dubhe Framework？

`schemagen` 生成的 Move 合约代码并非独立运行，它必须搭配 **Dubhe Framework**（链上已部署的 `dubhe` 包）才能工作。Framework 是一个已部署在 Sui 链上的基础设施包，为所有通过 Dubhe 构建的 DApp 提供存储引擎、事件系统、费用计量、权限管理和版本控制能力。

可以这样理解两者的关系：

```
你写的 DubheConfig（TypeScript）
         │
         ▼ dubhe schemagen
你的合约代码（Move）── 调用 ──▶ Dubhe Framework（链上已部署）
                                    │
                                    ▼
                               DappHub（链上共享对象）
```

---

### 整体架构分层

```
┌─────────────────────────────────────────────────────────────┐
│                     你的 DApp 合约包                         │
│  ┌──────────────────────────┐  ┌──────────────────────────┐ │
│  │   sources/systems/       │  │  sources/scripts/        │ │
│  │   手写业务逻辑（可编辑）   │  │  deploy_hook / migrate   │ │
│  └────────────┬─────────────┘  └──────────────────────────┘ │
│               │ 调用                                         │
│  ┌────────────▼─────────────────────────────────────────┐   │
│  │   sources/codegen/resources/（自动生成，禁止手动编辑）  │   │
│  │   health.move / stats.move / player_score.move …     │   │
│  └────────────┬─────────────────────────────────────────┘   │
└───────────────┼─────────────────────────────────────────────┘
                │ 调用 dubhe::dapp_system / dubhe::dapp_service
                ▼
┌─────────────────────────────────────────────────────────────┐
│               Dubhe Framework（链上已部署的 dubhe 包）        │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  系统层  dubhe::dapp_system                         │    │
│  │  · set_record / set_field / delete_record          │    │
│  │  · get_record / get_field / has_record             │    │
│  │  · create_dapp / upgrade_dapp                      │    │
│  │  · charge_fee（写入费用计量）                       │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │  核心层  dubhe::dapp_service                        │    │
│  │  · DappHub（全局共享对象，链上统一存储中心）          │    │
│  │  · ObjectTable<AccountKey, AccountData>             │    │
│  │  · dynamic_field 读写（实际数据存储）                │    │
│  │  · 发射 SetRecord / DeleteRecord 事件               │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │  内置资源  dubhe::dapp_metadata / dapp_fee_state    │    │
│  │         / dapp_fee_config                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  工具层  dubhe::entity_id / bcs / type_info / math  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│               链下索引器 / SDK（@0xobelisk/sui-sdk）          │
│  · 订阅 Dubhe_Store_SetRecord 事件，实时同步状态             │
│  · 调用 get_record / get_field 读取链上数据                  │
└─────────────────────────────────────────────────────────────┘
```

---

### DappHub：统一存储中心

Framework 部署时会通过 `init()` 将一个 **`DappHub`** 对象发布为全局共享对象（`share_object`）。链上只存在一个 DappHub，所有用 Dubhe 构建的 DApp 都把数据写入这同一个对象。

```
DappHub（全局共享对象）
└── accounts: ObjectTable<AccountKey, AccountData>
    ├── AccountKey { account: "0xABCD...", dapp_key: "my_project::dapp_key::DappKey" }
    │   └── AccountData（dynamic_field 容器）
    │       ├── key=["health"]       → value=[BCS(100u32)]
    │       └── key=["stats"]        → value=[BCS(50u32), BCS(200u32)]
    ├── AccountKey { account: "0xABCD...", dapp_key: "another_game::dapp_key::DappKey" }
    │   └── AccountData
    │       └── key=["level"]        → value=[BCS(5u32)]
    └── ...
```

**存储键的构成：** 每条记录由 `(resource_account, dapp_key_type_name)` 二元组定位到唯一的 `AccountData` 容器，再由 `[TABLE_NAME, ...extra_key_bytes]` 向量定位到容器内的具体字段。这个设计天然隔离了不同 DApp 的数据，即使它们共用同一个 DappHub。

---

### DappKey：类型级 DApp 身份证

`schemagen` 生成的 `dapp_key.move` 中定义了一个空结构体：

```move
public struct DappKey has copy, drop {}
```

这个类型是你的 DApp 在 Framework 中的唯一身份标识。所有写入和读取操作都以 `DappKey` 的完整类型名（`package_id::module::DappKey`）作为命名空间前缀，确保：

- 不同 DApp 之间的数据完全隔离，不会发生冲突
- `package_id()` 方法直接从类型名中提取当前包地址，用于 Global 资源的 `resource_account` 定位
- 写入函数标注 `(package)` 可见性，外部包无法伪造 `DappKey` 实例越权写入

---

### 生成的 Resource 模块是如何调用 Framework 的

以一个简单的 `health: 'u32'` 配置为例，`schemagen` 会生成 `health.move`，其核心写入路径为：

```
health::set(dapp_hub, resource_account, 100u32, ctx)
    │
    ├─ 1. 编码：encode(100u32) → vector<vector<u8>>
    │
    ├─ 2. 调用 dapp_system::set_record(dapp_hub, DappKey{}, ["health"], [[100u32_bcs]], account, false, ctx)
    │         │
    │         ├─ 2a. dapp_service::set_record(...)    ← 实际写入 DappHub dynamic_field
    │         │         └─ 发射 Dubhe_Store_SetRecord 事件
    │         │
    │         └─ 2b. charge_fee(...)                  ← 按字节数扣除存储积分
    │
    └─ 完成
```

读取路径则直接调用 `dapp_service::get_record / get_field`（不经过 `dapp_system`，不产生费用），返回 BCS 字节后在生成代码中反序列化为 Move 原生类型。

---

### Framework 的五大赋能能力

#### 1. 零基础设施开发：统一存储

开发者无需自己定义 Sui 对象、管理 `UID`、处理 `ObjectTable`。Framework 提供了开箱即用的键值存储，生成的 resource 模块只需传入 `&mut DappHub` 即可完成读写，大幅降低了 Move 合约的开发门槛。

#### 2. 实时链下同步：事件驱动

每次调用 `set_record` 或 `delete_record`，Framework 都会自动发射结构化事件：

```move
public struct Dubhe_Store_SetRecord has copy, drop {
    dapp_key: String,     // 哪个 DApp
    account: String,      // 哪个账户
    key: vector<vector<u8>>,    // 哪张表
    value: vector<vector<u8>>,  // 新的值
}
```

SDK 的实时订阅功能正是基于这些事件，让链下应用（游戏前端、数据看板、索引器）可以近乎实时地感知链上状态变化，无需轮询。

#### 3. 内置 DApp 生命周期管理

通过 `genesis.move` 中的 `run()` 入口，合约部署后会自动在 DappHub 中注册当前 DApp，写入：

- **DappMetadata**：名称、描述、管理员地址、当前版本、已授权的 package_id 列表
- **DappFeeState**：初始化存储积分，记录累计写入字节数、操作次数等运营数据

`migrate.move` 中的版本常量配合 Framework 的 `ensure_latest_version()` 检查，提供了安全的合约升级路径：旧版本的 package 无法继续写入，强制用户迁移到最新版本。

#### 4. 存储费用计量系统

Framework 的 `dapp_system::set_record` 包含自动费用计量逻辑。每次写入按以下公式计算并扣除积分：

```
费用 = (写入总字节数 × byte_fee + base_fee) × 操作次数
```

积分优先从免费额度（`free_credit`，新 DApp 注册时赠送）扣除，耗尽后从充值余额扣除。这一机制让 Dubhe 能够可持续地维护链上基础设施，同时通过免费额度降低早期开发者的成本。

#### 5. Offchain 模式：极低成本的数据发布

将 resource 配置为 `offchain: true` 时，Framework 会跳过 `ObjectTable` 写入，只发射事件。数据由链下索引器接收并存入数据库。这对高频更新（如游戏实时状态、日志）场景极为有价值——避免了链上存储的高昂 Gas 成本，同时保持了区块链的可审计性。

---

### 部署流程与 Framework 交互时序

```
开发者执行 dubhe publish
         │
         ▼
1. Sui 网络部署你的 Move 包
         │
         ▼
2. genesis::run(dapp_hub, clock, ctx) 被调用
         │
         ├─ 2a. dapp_system::create_dapp(dapp_hub, DappKey{}, name, description, clock, ctx)
         │       ├─ dapp_metadata::set(...)    ← 注册 DApp 元数据到 DappHub
         │       └─ dapp_fee_state::set(...)   ← 初始化存储积分账户
         │
         └─ 2b. deploy_hook::run(dapp_hub, ctx)
                 └─ 你的自定义初始化逻辑（如初始化全局配置、铸造初始资产等）
         │
         ▼
3. DApp 上线，resource 模块开始提供读写服务
```

---

### 数据存储结构详解

以下以 `player_stats`（keyed 多字段资源）为例，展示完整的链上存储布局：

```typescript
// DubheConfig
resources: {
  player_stats: {
    fields: { player: 'address', attack: 'u32', hp: 'u32' },
    keys: ['player']
  }
}
```

生成代码调用 `set(dapp_hub, resource_account, player_addr, 50u32, 200u32, ctx)` 后，DappHub 内部结构为：

```
DappHub.accounts
└── AccountKey {
        account: resource_account,        // 调用方传入的实体地址（如玩家钱包地址）
        dapp_key: "0xPKG::dapp_key::DappKey"
    }
    └── AccountData.dynamic_fields
        └── key = [b"player_stats", BCS(player_addr)]
                          ↑                  ↑
                       TABLE_NAME         keys 字段的 BCS 编码
            value = [BCS(50u32), BCS(200u32)]
                         ↑            ↑
                       attack          hp（非 key 的值字段，按声明顺序）
```

`get_field` 通过字段下标（`field_index: u8`）精确读取单个字段，避免反序列化整条记录，实现高效的局部更新。

---

## 配置文件加载机制

执行 `dubhe schemagen` 或 `dubhe publish` 时，CLI 会调用 `loadConfig(configPath?)`，流程如下：

1. 从当前目录向上查找以下文件（按优先级排序）：`dubhe.config.js`、`dubhe.config.mjs`、`dubhe.config.ts`、`dubhe.config.mts`
2. 使用 **esbuild** 将 TypeScript 配置编译为 ESM（打包本地 import，外部化 node_modules）
3. 动态 import 编译结果，返回其中的 `dubheConfig` 导出

---

## 其他导出

### `parseData(data)`

递归地将链上原始 BCS 响应对象转换为普通 JavaScript 对象，标准化 Sui 的 `{ variant, fields }` 包装格式（枚举和结构体结果使用此格式）。

```typescript
import { parseData } from '@0xobelisk/sui-common';
const result = parseData(rawOnChainObject);
```

### `SubscriptionKind`

```typescript
import { SubscriptionKind } from '@0xobelisk/sui-common';
// SubscriptionKind.Event | SubscriptionKind.Schema
```

SDK 用来区分实时订阅目标类型（事件 vs Schema 变更）。

### `defineConfig`

```typescript
import { defineConfig } from '@0xobelisk/sui-common';
export const dubheConfig = defineConfig({ ... });
```

一个轻量的恒等包装函数，为 `DubheConfig` 提供 TypeScript 类型检查。每个 `dubhe.config.ts` 都应该使用它。
