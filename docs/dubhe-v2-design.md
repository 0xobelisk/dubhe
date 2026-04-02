# Dubhe v2 — 架构设计文档

> 状态：**草稿** — 待审阅确认
> 范围：Framework 核心、Codegen 流水线、Client SDK

---

## 目录

1. [设计目标](#1-设计目标)
2. [v1 问题分析](#2-v1-问题分析)
3. [v2 对象模型](#3-v2-对象模型)
4. [性能设计 — 热路径写入](#4-性能设计--热路径写入)
5. [收费模型 v2 — 懒结算](#5-收费模型-v2--懒结算lazy-settlement)
6. [Codegen 流水线 v2](#6-codegen-流水线-v2)
7. [Client SDK v2](#7-client-sdk-v2)
8. [迁移策略](#8-迁移策略)
9. [待决问题](#9-待决问题)

---

## 1. 设计目标

| 目标                      | 说明                                                         |
| ------------------------- | ------------------------------------------------------------ |
| **最大吞吐量**            | 用户数据写入之间不应互相阻塞，无论是跨 DApp 还是同一 DApp 内 |
| **线性可扩展**            | 增加 DApp 数量或用户数量不应降低单用户 TPS                   |
| **DApp 开发者体验最小化** | 框架吸收复杂性，DApp 开发者看到简单的 API                    |
| **保留收费模型语义**      | DApp 为存储付费，用户不需要为每次写入付费                    |
| **Codegen 向后兼容**      | 现有 `dubhe.config.ts` 配置无需或仅需极少改动                |

---

## 2. v1 问题分析

### 2.1 全局 DappHub 单点瓶颈（严重）

`DappHub` 是一个 `shared object`。在 Sui 的执行模型中，所有对 `&mut DappHub` 的交易必须经过**共识排序**。这意味着所有 DApp 的写入交易共用一个全局队列。

```
DApp_A 用户1 写入 ──┐
DApp_A 用户2 写入 ──┤
DApp_B 用户1 写入 ──┼──→  &mut DappHub  ← 单一共识队列，完全串行
DApp_B 用户2 写入 ──┤
DApp_C 用户1 写入 ──┘
```

**影响：** 无论有多少 validator，TPS 都受限于共识吞吐量的上限。DApp 和用户越多，问题越严重。

### 2.2 每次写入都触碰瓶颈两次

每次调用 `set_record` 或 `set_field` 都会触发 `charge_fee`，后者读写 `DappHub` 内的 `dapp_fee_state`。因此单次用户写入导致 shared object 的**两次修改**：

```
set_record(dh, ...) {
    dapp_service::set_record(dh, ...)   // 修改 1：用户数据
    charge_fee(dh, ...)                 // 修改 2：费用状态扣减
}
```

这使每笔交易的 shared object 写入压力翻倍，费用状态本身也成为同一 DApp 所有用户的额外串行化节点。

### 2.3 版本检查和代理解析需要读取 Shared Object

每个系统入口函数顶部的常见守卫：

```move
dapp_system::ensure_latest_version<DappKey>(dh, migrate::on_chain_version()); // 读取 dh
let resource_address = address_system::ensure_origin(ctx);                    // 读取 dh（proxy 查找）
```

在 Sui 中，即使是对 shared object 的**只读**引用（`&DappHub`）也会强制交易走共识流程。只读的优势在于多个只读访问可以并行——但交易仍然无法使用 Sui 的 fastpath。

**影响：** 只要任何守卫读取 `DappHub`，热路径写入就无法走 fastpath。

### 2.4 用户数据嵌套在 DappHub 内部（三层间接寻址）

所有用户数据存储路径为：

```
DappHub.accounts: ObjectTable<AccountKey, AccountData>
  └── AccountData.id: UID
        └── dynamic_field[key] = value
```

- `AccountData` 作为 `DappHub` 的子对象存储，而非用户独立拥有的对象。
- 用户对自己的数据没有 Sui 原生的所有权保证。
- 每次读写都经过三层间接寻址。

### 2.5 DApp 之间没有隔离

所有 DApp 的数据（元数据、费用状态、用户记录、代理配置）都在同一个 shared object 中。一个写入密集的 DApp（如拥有 10,000 活跃玩家的游戏）会导致共享同一 DappHub 的所有其他 DApp 性能下降。

### 2.6 Codegen 到处假设 DappHub

每个生成的 resource 模块（如 `player.move`、`inventory.move`）都硬编码了如下签名：

```move
public(package) fun set(dapp_hub: &mut DappHub, resource_account: String, ..., ctx: &mut TxContext)
```

更改存储模型必须重新生成所有 DApp 代码，没有不重构 codegen 模板就能优化的路径。

### 2.7 SDK 只管理一个 Object ID

当前客户端初始化时只需要一个 `dappHubId`，完全不知道：

- Per-DApp 存储对象（`DappStorage`）
- Per-User 存储对象（`UserStorage`）

任何存储模型变更都需要手动更新 SDK 配置。

### 2.8 v1 问题汇总

| 问题                         | 根本原因                           | 严重程度 |
| ---------------------------- | ---------------------------------- | -------- |
| 全局 TPS 上限                | 单一 shared DappHub                | 🔴 严重  |
| 每次写入都触碰 shared object | `charge_fee` 写 DappHub            | 🔴 严重  |
| 跨 DApp 相互干扰             | 所有 DApp 共享 DappHub             | 🔴 严重  |
| 版本检查强制走共识           | `ensure_latest_version` 读 DappHub | 🟠 高    |
| Proxy 查找强制走共识         | `ensure_origin` 读 DappHub         | 🟠 高    |
| 用户数据无所有权             | 数据在 DappHub 的 ObjectTable 中   | 🟡 中    |
| Codegen 单一签名锁定         | 所有生成代码使用 DappHub           | 🟡 中    |
| SDK 不感知对象拓扑           | 只管理 DappHub ID                  | 🟡 中    |

---

## 3. v2 对象模型

### 3.1 三层架构

```
┌──────────────────────────────────────────────────────────────┐
│  第一层 · DappHub  [Shared · 全局唯一 · 近似不可变]            │
│                                                              │
│  · DApp 注册表：dapp_key_str → DappStorage object ID        │
│  · 全局费率配置：base_fee_per_write（MIST/次）               │
│  · Framework admin 地址、treasury 地址                       │
│                                                              │
│  写入：create_dapp（一次性）、修改全局费率（极低频）            │
│  读取：DApp 发现、框架配置查询                                 │
└──────────────────────────────┬───────────────────────────────┘
                               │ create_dapp 时为每个 DApp 创建一次
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  第二层 · DappStorage  [Shared · Per-DApp · 低频写入]         │
│                                                              │
│  · dapp_metadata：admin、version、package_ids、pausable      │
│  · dapp_fee_state：credit_pool（MIST）、total_settled        │
│                                                              │
│  写入：admin 操作、升级、结算（settle_writes）                 │
│  热路径写入：【完全不访问】                                    │
└──────────────────────────────┬───────────────────────────────┘
                               │ 用户每个 DApp 创建一次（SDK 自动）
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  第三层 · UserStorage  [Owned · 热路径]                       │
│                                                              │
│  · dapp_key: String             — DApp 命名空间              │
│  · canonical_owner: address     — 数据归属地址（永不改变）    │
│  · proxy_expires_at: u64        — 代理到期时间（0 = 无代理）  │
│  · write_count: u64             — 累计写入次数（热路径递增）  │
│  · settled_count: u64           — 已结算写入次数（结算时更新）│
│  · dynamic_field[key]           — 该用户在该 DApp 下的业务数据│
│                                                              │
│  写入：所有用户业务数据写入 + write_count++（fastpath ✅）     │
│  完全不涉及任何 shared object                                  │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 对象所有权汇总

| 对象          | 所有者                       | Sui 执行路径            | 写入频率                |
| ------------- | ---------------------------- | ----------------------- | ----------------------- |
| `DappHub`     | Shared                       | 需要共识                | 极低（框架 admin 操作） |
| `DappStorage` | Shared（per DApp）           | 需要共识                | 低（admin + 结算）      |
| `UserStorage` | 用户或代理钱包持有（可转移） | **Fastpath** — 无需共识 | 高（每次写入）          |

### 3.3 资源数据存储位置（按 config 属性）

| `dubhe.config.ts` 属性  | 存储位置                          | v1 等价位置 |
| ----------------------- | --------------------------------- | ----------- |
| `global: true`          | `DappStorage`（shared，per-DApp） | `DappHub`   |
| `global: false`（默认） | `UserStorage`（owned，per-user）  | `DappHub`   |
| `offchain: true`        | 仅 Event（无链上存储）            | 不变        |

---

## 4. 性能设计 — 热路径写入

### 4.1 并发模型对比

```
── v1（全部串行）─────────────────────────────────────────────

DApp_A 用户1 ──┐
DApp_A 用户2 ──┤
DApp_B 用户1 ──┼──→  &mut DappHub  ← 单一共识队列
DApp_B 用户2 ──┤
               └── TPS 上限 = 共识吞吐量

── v2（完全并行）─────────────────────────────────────────────

DApp_A 用户1 → &mut UserStorage_A1 ──┐ 并行 ✅
DApp_A 用户2 → &mut UserStorage_A2 ──┤ 并行 ✅
DApp_B 用户1 → &mut UserStorage_B1 ──┤ 并行 ✅
DApp_B 用户2 → &mut UserStorage_B2 ──┘ 并行 ✅

               TPS 上限 = Sui validator 硬件极限（理论无上限）
```

### 4.2 热路径写入 — 零 Shared Object 访问

```move
// 框架级常量：单个用户最大未结算写入次数（只有框架升级才能改变此值）
const MAX_UNSETTLED_WRITES: u64 = 200;

// v2 set_record：只碰 UserStorage（owned），完全 fastpath
public fun set_record<DappKey: copy + drop>(
    user_storage: &mut UserStorage,    // owned：数据写入 + 计费计数
    key:   vector<vector<u8>>,
    value: vector<vector<u8>>,
    ctx:   &mut TxContext
) {
    // 1. 验证 DApp 命名空间（本地字符串比较，无 I/O）
    assert!(user_storage.dapp_key == type_name::get<DappKey>().into_string(), EDappKeyMismatch);

    // 2. 若代理激活，检查代理是否已过期（owned 对象字段比较，fastpath ✅）
    //    Sui 协议层保证：能提交含此对象的交易，ctx.sender() 就是当前 Sui 对象 owner
    if (user_storage.proxy_expires_at > 0) {
        assert!(ctx.epoch_timestamp_ms() < user_storage.proxy_expires_at, EProxyExpired);
    };

    // 3. 欠债上限：防止 DApp 不结算导致无限欠债（框架常量，零 shared object 访问，fastpath ✅）
    //    用户未结算写入 ≥ 200 次时，必须先触发 settle_writes 清账才能继续写入
    assert!(
        user_storage.write_count - user_storage.settled_count < MAX_UNSETTLED_WRITES,
        EUserDebtLimitExceeded
    );

    // 4. 写入用户数据（owned 对象写入 — fastpath）
    user_storage::set(&mut user_storage.id, key, value);

    // 5. 累计写入计数（SDK 后台批量结算时使用）
    user_storage.write_count = user_storage.write_count + 1;

    // 6. 事件以 canonical_owner 标识数据归属（代理场景下不变）
    emit_set_record(user_storage.dapp_key, user_storage.canonical_owner, key, value);
}
```

**以上六步全部只操作本地变量或 owned 对象，零 shared object 访问。代理场景和直接调用场景完全相同的函数签名。**

### 4.3 版本检查：移至 DApp 系统函数层

v1/Session 模型将版本检查内嵌在框架的 `set_record` 里，需要读取 shared object 或依赖 SessionQuota 快照。

v2 懒结算模型中，框架的 `set_record` **不做版本检查**。版本保障由两个机制共同提供：

**机制一：Sui 包升级自然隔离（零成本）**

- DApp 升级时发布新包，旧包的函数继续存在但逻辑已旧
- DApp 开发者在系统函数（`move_player` 等）中按需加版本守卫：

```move
// DApp 系统函数示例（DApp 开发者写，不在框架层）
public entry fun move_player(
    dapp_storage: &DappStorage,    // 只读，不是热路径瓶颈
    user_storage: &mut UserStorage,
    direction: u8,
    ctx: &mut TxContext
) {
    // DApp 自行决定是否检查版本
    dapp_system::assert_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
    // ... 游戏逻辑 ...
    character::set(user_storage, new_hp, new_level, ctx);
}
```

**机制二：`UserStorage.dapp_version` 可选本地版本检查（完全 fastpath）**

若 DApp 需要在 `set_record` 层面强制版本，可在 `UserStorage` 中存储期望版本号，与包常量比较：

```move
// 可选：DApp 在 set_record 之前检查（均为 owned object，fastpath）
assert!(user_storage.dapp_version == migrate::on_chain_version(), EVersionMismatch);
// 若版本不匹配，用户需调用一次 update_user_version(dapp_storage, user_storage) 更新
```

### 4.4 Proxy 设计：所有权转移，DApp 开发者零感知

#### 问题根源

Sui 协议的硬性约束：**只有对象的 owner 才能把它放进交易**。因此：

- v1 的解法（在 `DappHub` 存 proxy mapping，运行时解析）需要每次读取 shared object。
- 若 v2 继续沿用"shared object 存代理映射 + 运行时查询"的思路，DApp 开发者仍需写**两套调用接口**（直接版本 vs 代理版本），开发体验极差。

#### v2 解法：代理激活 = 转移 UserStorage 所有权

把 `UserStorage` 的 **Sui 对象 owner**（谁能签交易）与 **`canonical_owner`**（数据归谁）分离：

```
字段                        含义
──────────────────────────────────────────────────
canonical_owner: address    数据归属（永不改变，用于命名空间和费用归属）
Sui 对象 owner              当前有权签交易的地址（代理激活时转移给代理钱包）
proxy_expires_at: u64       代理过期时间（0 = 无代理，直接持有）
```

```
无代理时：                        代理激活后：
UserStorage                       UserStorage
  Sui owner     = Alice             Sui owner     = ProxyWallet  ← 转移
  canonical_owner = Alice           canonical_owner = Alice      ← 永不变
  proxy_expires_at = 0              proxy_expires_at = now + 7d
```

#### DApp 开发者：一套调用覆盖所有场景

```move
// 代理场景和直接场景完全相同的函数签名，DApp 开发者只需写一套
public entry fun move_player(
    user_storage: &mut UserStorage,
    direction: u8,
    ctx: &mut TxContext
) {
    character::set(user_storage, new_hp, new_level, ctx);
}
```

**Sui 协议层保证：** 能成功提交含 `user_storage` 的交易，说明 `ctx.sender()` 就是当前 Sui 对象 owner（无论是本人还是代理钱包）。框架不需要额外验证 sender。

#### 代理生命周期管理

```move
// 最短代理时长：防止 duration_ms = 0 导致立即过期后对象无法操作
const MIN_PROXY_DURATION_MS: u64 = 3_600_000; // 1 小时

// 1. 激活代理（canonical_owner 调用，将 UserStorage 转移给代理钱包）
public fun activate_proxy<DappKey: copy + drop>(
    user_storage:  UserStorage,      // 消耗所有权
    proxy_wallet:  address,
    duration_ms:   u64,
    ctx:           &mut TxContext
) {
    assert!(user_storage.canonical_owner == ctx.sender(), ENotCanonicalOwner);
    assert!(user_storage.proxy_expires_at == 0, EProxyAlreadyActive);
    // [M2] 防止 duration_ms = 0 导致代理对象立即过期且 canonical_owner 无法操作
    assert!(duration_ms >= MIN_PROXY_DURATION_MS, EInvalidProxyDuration);
    // [M3] 防止代理给自己（设置了过期时间但对象留在自己手上，逻辑混乱）
    assert!(proxy_wallet != ctx.sender(), EProxySelf);

    user_storage.proxy_expires_at = ctx.epoch_timestamp_ms() + duration_ms;
    transfer::transfer(user_storage, proxy_wallet);  // 转移给代理钱包
}

// 2. 主动撤销（代理钱包归还 UserStorage 给 canonical_owner）
public fun deactivate_proxy<DappKey: copy + drop>(
    user_storage:  UserStorage,      // 代理钱包持有
    ctx:           &mut TxContext
) {
    assert!(user_storage.proxy_expires_at > 0, ENoActiveProxy);
    let owner = user_storage.canonical_owner;
    user_storage.proxy_expires_at = 0;
    transfer::transfer(user_storage, owner);  // 归还给 canonical_owner
}
```

**代理过期后的处理：**

代理过期后（`proxy_expires_at < now`），`set_record` 内部检查触发 `EProxyExpired`，代理钱包的所有写入交易失败。

| 方式                   | 操作者          | 说明                                                              |
| ---------------------- | --------------- | ----------------------------------------------------------------- |
| **主动归还（推荐）**   | 代理钱包        | 代理钱包调用 `deactivate_proxy`，清零过期时间，归还 `UserStorage` |
| **创建新 UserStorage** | canonical_owner | Alice 重新创建一个 `UserStorage`，旧数据留在旧对象中无法迁移      |

> ⚠️ **[M1] 对象人质风险：** 代理过期后，`UserStorage` 的 Sui 对象 owner 仍是代理钱包。`canonical_owner` **无法主动取回**——Sui 协议只允许对象的当前 owner 提交包含该对象的交易。若代理钱包私钥丢失或恶意不配合调用 `deactivate_proxy`，`canonical_owner` 只能放弃旧对象、创建新 `UserStorage`，历史数据将永久锁死在旧对象里（不可写、不可迁移）。
>
> **SDK 必须在代理到期前自动归还**（而非等到过期后），这是防止上述极端情况的唯一可靠手段。建议 SDK 在代理剩余时间 ≤ 10% 时自动触发 `deactivate_proxy`。

#### 代理场景下的 set_record（完整 fastpath）

```move
// 框架级常量：单个用户最大未结算写入次数（只有框架升级才能改变此值）
const MAX_UNSETTLED_WRITES: u64 = 200;

public fun set_record<DappKey: copy + drop>(
    user_storage: &mut UserStorage,
    key:   vector<vector<u8>>,
    value: vector<vector<u8>>,
    ctx:   &mut TxContext
) {
    // 1. DApp 命名空间校验
    assert!(user_storage.dapp_key == type_name::get<DappKey>().into_string(), EDappKeyMismatch);

    // 2. 代理过期检查（owned 对象字段比较，fastpath ✅，无 shared object 访问）
    if (user_storage.proxy_expires_at > 0) {
        assert!(ctx.epoch_timestamp_ms() < user_storage.proxy_expires_at, EProxyExpired);
    };

    // 3. 欠债上限：DApp 不结算则用户写满 200 次后写入失败，游戏崩溃迫使 DApp admin 补充信用
    assert!(
        user_storage.write_count - user_storage.settled_count < MAX_UNSETTLED_WRITES,
        EUserDebtLimitExceeded
    );

    // 4. 写入数据（owned 对象写入 — fastpath）
    user_storage::set(&mut user_storage.id, key, value);
    user_storage.write_count = user_storage.write_count + 1;

    // 5. 事件始终以 canonical_owner 标识数据归属（代理场景下不变）
    emit_set_record(user_storage.dapp_key, user_storage.canonical_owner, key, value);
}
```

**零 shared object 访问**，包括代理过期检查和欠债上限检查均为纯本地字段比较。

### 4.5 各操作的 Shared Object 访问频率对比

| 操作            | v1 访问                    | v2 访问                                               |
| --------------- | -------------------------- | ----------------------------------------------------- |
| 用户数据写入    | `&mut DappHub`（写，每次） | **无**                                                |
| 费用扣减        | `&mut DappHub`（写，每次） | **无**（write_count 在 UserStorage）                  |
| 版本检查        | `&DappHub`（读，每次）     | **无**（DApp 层按需，或 UserStorage 常量比较）        |
| Proxy 查找      | `&DappHub`（读，每次）     | **无**（`proxy_expires_at` 在 UserStorage，fastpath） |
| 费用结算        | 无（v1 即时扣费）          | `&mut DappStorage`（低频，SDK 自动批量）              |
| DApp admin 升级 | `&mut DappHub`             | `&mut DappStorage`（隔离）                            |
| Proxy 注册/撤销 | `&mut DappHub`             | **无**（UserStorage 所有权转移，无需 shared object）  |
| DApp 注册       | `&mut DappHub`             | `&mut DappHub`（不变）                                |

---

## 5. 收费模型 v2 — 懒结算（Lazy Settlement）

### 5.1 设计目标：用户无感知的自动收费

v1 的问题是每次写入都必须碰 shared object；Session 方案解决了性能问题，但把"session 重领"的负担暴露给了用户和 DApp 开发者。

**v2 懒结算模型的核心思路：**

> 把"记录写了多少次"和"收钱"完全分离。
> 写入时只更新自己的 owned 对象（fastpath），SDK 在背后自动批量结算，用户和开发者对此毫无感知。

类比：AWS 账单模型

```
AWS 模型（v2 懒结算）：
  用户 → 直接调用服务（无需预购配额）
  服务 → 记录用量（per-write counter，owned object，fastpath）
  月底 → 系统自动出账单，扣款（settlement，低频 shared object 写入）

❌ 非 AWS 模型（v1 / Session）：
  用户 → 先买套餐 → 再使用 → 套餐到期手动续费
```

### 5.2 懒结算模型总览

```
用户每次 set_record()
        │
        │  只碰 UserStorage（owned object，fastpath ✅）
        │  write_count += 1
        ▼
UserStorage.write_count = N（用户持有）
        │
        │  SDK 在后台检测（满足任一条件即触发）：
        │  ① write_count - settled_count >= SETTLE_THRESHOLD（50 次）
        │  ② 距上次结算 > SETTLE_INTERVAL_MS（1 小时）
        │  ③ unsettled >= MAX_UNSETTLED_WRITES × 80%（160 次，主动防触顶）
        │  → 满足：始终插入 settle_writes()，无需预检信用余额
        │  → 链上按实际信用结算（充足→全量，不足→部分，耗尽→静默跳过）
        ▼
settle_writes(&DappHub, &mut DappStorage, &mut UserStorage)（低频）
        │  per_write_fee ← DappHub（只读，获取当前费率）
        │  cost = (write_count - settled_count) * per_write_fee
        │  DappStorage.credit_pool -= cost
        │  UserStorage.settled_count = write_count
        ▼
DappStorage.credit_pool（DApp 预存的 SUI 余额）
```

**三个关键特性：**

- **热路径零 shared object**：写入只碰用户自己的 `UserStorage`
- **用户无感知**：SDK 自动触发结算，对 DApp 开发者和游戏玩家完全透明
- **框架精确收费**：每次写入都被计入 `write_count`，最终一定会被结算

### 5.3 UserStorage 结构（新增计费字段）

```move
public struct UserStorage has key {
    id:               UID,
    dapp_key:         String,
    canonical_owner:  address,   // 数据归属地址，永不改变（用于命名空间和费用归属）
    proxy_expires_at: u64,       // 代理到期时间（0 = 无代理，直接持有）
    write_count:      u64,       // 累计写入次数（单调递增，热路径写入）
    settled_count:    u64,       // 已结算的写入次数（结算时更新）
    // ... DApp 数据（dynamic fields）
}
```

> `write_count - settled_count` = 待结算的写入次数

### 5.4 热路径写入（零 shared object）

```move
// 框架级常量：单个用户最大未结算写入次数（只有框架升级才能改变此值）
const MAX_UNSETTLED_WRITES: u64 = 200;

// framework 生成（codegen），用户数据写入
public fun set_record<DappKey: copy + drop>(
    user_storage: &mut UserStorage,    // owned object — fastpath ✅
    key:   vector<vector<u8>>,
    value: vector<vector<u8>>,
    ctx:   &mut TxContext
) {
    assert!(user_storage.dapp_key == type_name::get<DappKey>().into_string(), EDappKeyMismatch);

    // 若代理激活，检查代理是否已过期（owned 对象字段比较，fastpath）
    if (user_storage.proxy_expires_at > 0) {
        assert!(ctx.epoch_timestamp_ms() < user_storage.proxy_expires_at, EProxyExpired);
    };

    // 欠债上限：防止 DApp 不结算导致无限欠债（框架常量，零 shared object 访问，fastpath ✅）
    assert!(
        user_storage.write_count - user_storage.settled_count < MAX_UNSETTLED_WRITES,
        EUserDebtLimitExceeded
    );

    // 写入数据
    store_data(&mut user_storage.id, key, value);

    // 递增写入计数（owned object 写入，fastpath）
    user_storage.write_count = user_storage.write_count + 1;

    // ✅ 无任何 DappStorage / DappHub 访问
}
```

### 5.5 费用结算（低频 shared object 写入）

`settle_writes` 同时接受 `&DappHub`（只读，获取当前费率）和 `&mut DappStorage`（写入，扣减信用池）。两个 shared object 同时参与，但结算是**低频**操作（每 50 次写入或每小时一次），对整体性能影响可忽略不计。

**三项关键安全设计：**

1. **静默跳过而非 abort**：信用不足时函数直接 `return`，不会中断同一 PTB 中的用户写入操作（避免 TOCTOU 竞态导致用户交易失败）
2. **跨 DApp 校验**：同时验证 `dapp_storage` 和 `user_storage` 的 `dapp_key`，防止攻击者传入错误的 `dapp_storage` 消耗其他 DApp 的信用池
3. **部分结算**：信用不足时按可用余额尽量多结算，而非全部放弃，减少欠债堆积

```move
// 结算函数：任何人均可触发（SDK 自动调用，也可手动）
// 同时传入 DappHub（读取费率）和 DappStorage（扣减信用池）
public fun settle_writes<DappKey: copy + drop>(
    dapp_hub:      &DappHub,           // 只读：获取当前 per_write_fee
    dapp_storage:  &mut DappStorage,   // 写入：扣减 credit_pool
    user_storage:  &mut UserStorage,   // 写入：更新 settled_count
    ctx:           &mut TxContext
) {
    let unsettled = user_storage.write_count - user_storage.settled_count;
    if (unsettled == 0) return;

    // [H2] 双重 dapp_key 校验：user_storage 和 dapp_storage 必须属于同一 DApp
    // 防止攻击者传入错误的 dapp_storage 消耗其他 DApp 的信用池
    let dapp_key_str = type_name::get<DappKey>().into_string();
    assert!(user_storage.dapp_key  == dapp_key_str, EDappKeyMismatch);
    assert!(dapp_storage.dapp_key  == dapp_key_str, EDappKeyMismatch);

    // 从 DappHub 读取当前有效费率（支持涨价延迟生效）
    let per_write_fee = dapp_hub::get_effective_fee_per_write(dapp_hub, ctx.epoch_timestamp_ms());

    // [N2] 免费结算特判：框架设置 per_write_fee = 0 时（免费层），直接标记全部已结算
    // 不能用 available/per_write_fee，会触发除零异常；也不应 emit SettlementSkipped（无需告警）
    if (per_write_fee == 0) {
        user_storage.settled_count = user_storage.write_count;
        emit(WritesSettled {
            dapp_key:   user_storage.dapp_key,
            owner:      user_storage.canonical_owner,
            count:      unsettled,
            cost:       0,
            new_credit: dapp_fee_state::available_credit(dapp_storage),
        });
        return
    };

    // [L1] 部分结算：按可用信用计算最多能结算多少次写入
    let available = dapp_fee_state::available_credit(dapp_storage);
    if (available == 0) {
        // [H1] 信用耗尽：静默返回，不 abort PTB，让用户写入照常执行
        emit(SettlementSkipped {
            dapp_key:  user_storage.dapp_key,
            owner:     user_storage.canonical_owner,
            unsettled,
        });
        return
    };

    let affordable_count = min_u64(unsettled, (available / per_write_fee) as u64);
    let cost = (affordable_count as u256) * per_write_fee;
    dapp_fee_state::deduct(dapp_storage, cost);

    // settled_count 单调递增，不可倒退
    user_storage.settled_count = user_storage.settled_count + affordable_count;

    let still_unsettled = user_storage.write_count - user_storage.settled_count;
    if (still_unsettled > 0) {
        // 部分结算后仍有欠债，发出告警供 DApp admin 监控
        emit(SettlementPartial {
            dapp_key:       user_storage.dapp_key,
            owner:          user_storage.canonical_owner,
            settled:        affordable_count,
            still_unsettled,
        });
    } else {
        emit(WritesSettled {
            dapp_key:   user_storage.dapp_key,
            owner:      user_storage.canonical_owner,
            count:      affordable_count,
            cost,
            new_credit: dapp_fee_state::available_credit(dapp_storage),
        });
    }
}
```

### 5.6 SDK 自动打包（用户无感知）

SDK 在每次构建 PTB 前判断是否需要结算，**满足阈值即直接插入 `settle_writes`，不再做信用预检**。

**为什么移除信用预检：**

`settle_writes` 链上已经能优雅处理信用不足（静默返回 + emit 事件），不会 abort PTB。如果 SDK 继续做预检并跳过插入，会导致 `lastSettleTime` 不更新，下次交易仍判断"需要结算"，形成每次都跳过的死循环并持续消耗 RPC。将信用判断完全委托给链上，逻辑更简洁、更正确。

```typescript
// SDK 内部逻辑，DApp 开发者不需要关心
async function buildTransaction(actions: TxAction[]) {
  const ptb = new Transaction();

  // [N1] 只查询 UserStorage，不再需要预查 credit_pool
  const userStorage = await getUserStorage(dappKey, sender);

  const unsettled = userStorage.write_count - userStorage.settled_count;
  const needsSettle = unsettled >= SETTLE_THRESHOLD || timeSinceLastSettle() > SETTLE_INTERVAL_MS;

  if (needsSettle) {
    // 始终插入 settle_writes，无论信用是否充足
    // 链上会处理：信用充足→正常结算，不足→部分结算，耗尽→静默跳过（不 abort）
    ptb.moveCall({
      target: `${FRAMEWORK_PKG}::dapp_system::settle_writes`,
      arguments: [
        ptb.object(dappHubId), // &DappHub（只读）
        ptb.object(dappStorageId), // &mut DappStorage
        ptb.object(userStorage.id) // &mut UserStorage
      ]
    });
    // 无论链上结算结果如何，都更新时间戳，防止下次交易重复触发
    this.lastSettleTime = Date.now();
  }

  // 用户实际动作（与结算步骤共处一个 PTB，结算失败不影响此处）
  for (const action of actions) {
    ptb.moveCall(action);
  }

  return ptb;
}
```

**链上事件驱动的监控（替代 SDK 预检）：** 信用告警改为监听链上 event，DApp admin 可以更准确地响应：

```typescript
// DApp 开发者只需要这样写
await dubhe.execute([dubhe.tx.game_system.move_player(direction)]);

// 监听链上结算事件（SDK 订阅，可选）
dubhe.on('SettlementSkipped', ({ unsettled }) =>
  notifyAdmin(`Credit exhausted, ${unsettled} writes pending`)
);
dubhe.on('SettlementPartial', ({ settled, still_unsettled }) =>
  notifyAdmin(`Partial settlement: ${settled} settled, ${still_unsettled} still pending`)
);
```

### 5.7 框架费率配置与调价

#### 5.7.1 费率配置结构

```move
// [L3] 限制历史记录最大条数，防止 DappHub 对象无限增长
const MAX_FEE_HISTORY: u64 = 20;

// [L4] 涨价延迟生效：新费率在 fee_effective_at_ms 之后才生效
// 存储在 DappHub 中，由框架 admin 管理
public struct FrameworkFeeConfig has store {
    base_fee_per_write:    u256,   // 当前生效费率（MIST/次）
    pending_fee_per_write: u256,   // 待生效的新费率（0 = 无待定调价）
    fee_effective_at_ms:   u64,    // 新费率生效时间（0 = 立即生效）
    treasury:              address,
    fee_history:           vector<FeeHistoryEntry>,
}

public struct FeeHistoryEntry has store, copy, drop {
    base_fee_per_write: u256,
    effective_from_ms:  u64,
}
```

`settle_writes` 调用 `get_effective_fee_per_write(dapp_hub, now)` 获取费率：

```move
// 只读，无需 &mut —— 结算时按时间判断应使用哪个费率
public fun get_effective_fee_per_write(config: &FrameworkFeeConfig, now_ms: u64): u256 {
    if (config.pending_fee_per_write > 0 && now_ms >= config.fee_effective_at_ms) {
        config.pending_fee_per_write   // 涨价已生效
    } else {
        config.base_fee_per_write      // 使用当前费率
    }
}
```

#### 5.7.2 调价流程

```move
// [L4] 涨价：必须设置至少 48 小时的延迟，给 DApp admin 时间补充 credit
const MIN_FEE_INCREASE_DELAY_MS: u64 = 172_800_000; // 48 小时

// 仅框架 admin 可调用
public fun update_framework_fee(
    _admin:   &FrameworkAdminCap,
    dapp_hub: &mut DappHub,
    new_fee:  u256,
    ctx:      &mut TxContext
) {
    let config = dapp_hub::borrow_fee_config_mut(dapp_hub);
    let now_ms = ctx.epoch_timestamp_ms();

    // [N3] 惰性提交：若之前的待定涨价已过生效时间，先将其提交为 base_fee
    // 这确保 base_fee_per_write 始终代表"当前已生效的费率"
    if (config.pending_fee_per_write > 0 && now_ms >= config.fee_effective_at_ms) {
        config.base_fee_per_write    = config.pending_fee_per_write;
        config.pending_fee_per_write = 0;
        config.fee_effective_at_ms   = 0;
    };

    // [N3] 以"当前有效费率"作为涨降价基准，而非陈旧的 base_fee_per_write
    // 避免：pending=200 尚未生效时，admin 提交 150 被误判为涨价（相对 base=100）
    let current_effective = if (config.pending_fee_per_write > 0) {
        config.pending_fee_per_write   // 待定费率尚未生效，以它为基准
    } else {
        config.base_fee_per_write      // 无待定，以当前生效费率为基准
    };

    // [L4] 真正的涨价走延迟通道；降价或持平立即生效
    if (new_fee > current_effective) {
        config.pending_fee_per_write = new_fee;
        config.fee_effective_at_ms   = now_ms + MIN_FEE_INCREASE_DELAY_MS;
    } else {
        // 降价：立即生效，同时清除任何待定涨价
        config.base_fee_per_write    = new_fee;
        config.pending_fee_per_write = 0;
        config.fee_effective_at_ms   = 0;
    };

    // [L3] 写入历史记录，超出最大条数时滚动丢弃最旧的一条
    config.fee_history.push_back(FeeHistoryEntry {
        base_fee_per_write: new_fee,
        effective_from_ms:  now_ms,
    });
    if (config.fee_history.length() > MAX_FEE_HISTORY) {
        config.fee_history.remove(0);
    };

    emit(FeeUpdateScheduled {
        old_fee:          current_effective,
        new_fee,
        effective_at_ms:  config.fee_effective_at_ms,  // 0 表示立即生效
    });
}
```

#### 5.7.3 调价影响范围

懒结算模型中，费率在**结算时**生效（不是写入时）。引入涨价延迟后规则如下：

| 场景                   | 费率使用规则                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| 正常写入（未结算）     | 写入时不涉及费率，只递增计数                                                                            |
| **框架降价**           | 立即生效，未结算写入按新（低）费率结算 → 对 DApp admin 有利                                             |
| **框架涨价（48h 内）** | `pending_fee_per_write` 已设定但 `fee_effective_at_ms` 未到，`get_effective_fee_per_write` 仍返回旧费率 |
| **框架涨价（48h 后）** | `get_effective_fee_per_write` 返回新费率；下次 `update_framework_fee` 调用时惰性提交为 `base_fee`       |
| **48h 内二次调价**     | 以 `pending_fee_per_write`（而非 `base_fee`）为基准判断涨降，结果正确                                   |
| 已结算的写入           | 不受影响（已完成扣费）                                                                                  |

> ⚠️ **涨价流程：** 框架 admin 提交涨价后，链上自动 emit `FeeUpdateScheduled` 事件（含 `effective_at_ms`）。SDK 订阅该事件，提前通知 DApp admin 在生效前完成充值。48 小时后新费率通过 `get_effective_fee_per_write` 自动生效，无需二次链上操作。

### 5.8 DApp 信用池管理

#### 5.8.1 充值

```move
// DApp admin 调用，SUI 立即转入框架金库
public fun recharge_credit<DappKey: copy + drop>(
    _admin:       &AdminCap<DappKey>,
    dapp_storage: &mut DappStorage,
    payment:      Coin<SUI>,
    ctx:          &mut TxContext
) {
    let amount = payment.value();
    transfer::public_transfer(payment, framework_config::treasury(dapp_storage));
    dapp_fee_state::add_credit(dapp_storage, amount);
    // 发出充值事件，方便 SDK 监控
    emit(CreditRecharged { dapp_key: ..., amount, new_balance: ... });
}
```

#### 5.8.2 信用不足时的行为

分为两种维度：**写入是否受阻** 和 **欠债是否触发悬停**。

**写入欠债上限**（核心保障）：`set_record` 在纯本地字段上检查 `write_count - settled_count < MAX_UNSETTLED_WRITES`（框架常量 200）。若用户未结算写入达到上限，写入被拒绝（`EUserDebtLimitExceeded`），直到 `settle_writes` 成功清账。此检查零 shared object 访问，完全 fastpath。

**结算跳过策略**：`settle_writes` 在链上按 DApp 信用余额按量结算，信用不足时静默返回（emit `SettlementSkipped` 事件），不 abort PTB。

**欠债悬停机制**：`DappStorage` 记录 `max_unsettled_threshold`（链上配置）。链下服务定期检查各 DApp 的欠债量，超阈值时通过 admin 操作触发悬停。

```move
public struct DappFeeState has store {
    credit_pool:              u256,    // 已充值的可用余额（MIST）
    max_unsettled_threshold:  u64,     // 最大允许欠债写入次数（链上配置）
    suspended:                bool,    // 是否处于欠债悬停状态
}
```

| 信用/欠债状态                         | 写入行为                                  | 结算行为                     | 新用户注册        |
| ------------------------------------- | ----------------------------------------- | ---------------------------- | ----------------- |
| 信用充足，用户欠债 < 200              | ✅ 正常                                   | ✅ 正常结算                  | ✅ 允许           |
| 信用低于警戒线，用户欠债 < 200        | ✅ 正常                                   | ⚠️ SDK 触发结算但跳过 + 告警 | ✅ 允许           |
| 信用耗尽，用户欠债 < 200              | ✅ 正常                                   | ⚠️ `settle_writes` 静默跳过  | ✅ 允许           |
| 信用耗尽，用户欠债 = 200              | ❌ `EUserDebtLimitExceeded`               | ⚠️ 跳过（无信用可用）        | ✅ 允许           |
| DApp 欠债 > `max_unsettled_threshold` | ❌ 新用户欠债已满，已有用户视自身欠债而定 | ⚠️ 跳过                      | ❌ 暂停新用户注册 |

> **激励对齐**：DApp admin 如果不充值 credit，`settle_writes` 将持续跳过，用户欠债不断累积，最终触碰 200 次上限导致写入失败。游戏对用户不可用，DApp admin 必须补充信用才能恢复。这将"DApp 必须付费"由"社会承诺"提升为**技术强制约束**。

**悬停 / 恢复流程：**

```
DApp 欠债 > max_unsettled_threshold（链下检测）
        │
        ▼
admin 调用 suspend_dapp(admin_cap, dapp_storage)
        │ suspended = true
        │ 新 UserStorage 创建被拒绝（EDappSuspended）
        │ 已有用户写入不受 suspended 标志影响，
        │ 但仍受 MAX_UNSETTLED_WRITES = 200 约束：
        │ 若用户欠债已满 200 次，写入继续失败
        │
DApp admin 调用 recharge_credit(...)
        │ credit_pool 补充至足够偿还欠债
        │
SDK 自动结算所有用户欠债
        │（可能分多批次，直到各用户 settled_count 追上 write_count）
        │
admin 调用 unsuspend_dapp(admin_cap, dapp_storage)
        │ 链上前提检查（二选一）：
        │   ① credit_pool > 0（保证有资金结算后续欠债）
        │   ② total_unsettled < max_unsettled_threshold（欠债已降至阈值以下）
        │ 满足才允许 unsuspend，否则 abort（EStillUnsettled）
        │ suspended = false，恢复正常
```

```move
// unsuspend_dapp 内部前提校验
public fun unsuspend_dapp(
    _admin:       &FrameworkAdminCap,
    dapp_storage: &mut DappStorage,
) {
    // 必须有可用信用，确保恢复后能偿还后续欠债
    assert!(
        dapp_fee_state::available_credit(dapp_storage) > 0,
        EInsufficientCreditToUnsuspend
    );
    dapp_fee_state::set_suspended(dapp_storage, false);
    emit(DappUnsuspended { dapp_key: dapp_storage.dapp_key });
}
```

> ⚠️ **运营建议：** DApp admin 应监控 `CreditLow`、`SettlementSkipped` 和 `SettlementPartial` 事件，在欠债触发悬停之前主动充值。悬停状态下 `suspended` 标志仅阻止新用户注册；已有用户写入依旧受 `MAX_UNSETTLED_WRITES` 限制约束。

### 5.9 安全性分析

| 攻击/风险场景                                 | 分析                                                       | 结论                                                                                                                                                                                           |
| --------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DApp 拒绝结算（前端不调用 settle_writes）** | DApp admin 控制前端，故意不插入结算步骤，绕过收费          | ✅ `set_record` 硬编码 `MAX_UNSETTLED_WRITES = 200` 本地断言；DApp 不结算则用户欠债达到 200 次后写入失败，游戏对所有用户不可用；DApp admin 被迫充值 + 结算才能恢复，"不付费"直接等于"游戏崩溃" |
| **无限写入耗尽信用池**                        | 攻击者写入大量数据导致 credit 耗尽                         | ✅ 攻击者需消耗正常 Sui gas；每个账号最多 200 次未结算写入，总伤害有界；credit 耗尽 + 欠债满后写入失败，DoS 成本高昂                                                                           |
| **write_count 伪造**                          | 攻击者篡改 `write_count` 绕过结算                          | ✅ `UserStorage` 为 owned object，`write_count` 仅由框架包内部函数修改，外部无法篡改                                                                                                           |
| **settled_count 倒退**                        | 攻击者将 `settled_count` 设回 0 制造重复收费               | ✅ `settled_count` 在 `settle_writes` 中只能被设置为 `write_count`（单调不减），无法倒退                                                                                                       |
| **结算时 credit_pool 不足**                   | 结算时 credit 恰好耗尽                                     | ✅ SDK 始终插入 `settle_writes`，无需链下预检；链上按可用余额部分结算，彻底耗尽时静默返回（emit `SettlementSkipped`），不 abort PTB；用户写入照常执行；DApp admin 补充信用后下次结算自动恢复   |
| **版本绕过**                                  | 攻击者用旧版合约绕过新逻辑                                 | ✅ Sui 包升级模型天然隔离；DApp 系统函数可在入口加版本守卫                                                                                                                                     |
| **用户承担结算 Gas**                          | 用户支付了 DApp 债务的结算 Gas                             | 📝 运营建议：DApp 应为用户开启 Gas Sponsorship（Sui 原生支持），使结算 Gas 也由 DApp 承担，用户零负担                                                                                          |
| **跨 DApp 信用池攻击**                        | 攻击者传入错误 `dapp_storage` 消耗其他 DApp 信用           | ✅ `settle_writes` 双重 `dapp_key` 校验（`user_storage` 和 `dapp_storage` 均需匹配 `<DappKey>`）                                                                                               |
| **结算 PTB 竞态（TOCTOU）**                   | SDK 链下预检通过后链上信用耗尽，abort 用户交易             | ✅ `settle_writes` 信用不足时静默返回（emit 事件），不 abort PTB；部分结算尽量减少欠债                                                                                                         |
| **涨价突袭 DApp admin**                       | 框架涨价后 DApp 存量欠债按新高费率结算导致 credit 耗尽     | ✅ 涨价强制 48 小时延迟生效（`MIN_FEE_INCREASE_DELAY_MS`）；降价立即生效对 DApp 有利                                                                                                           |
| **代理对象人质**                              | 代理钱包私钥丢失，`canonical_owner` 无法取回 `UserStorage` | ⚠️ Sui owned object 硬限制；SDK 必须在代理到期前自动归还，用户应选择可信代理钱包                                                                                                               |
| **零时长代理**                                | `activate_proxy(duration_ms=0)` 产生立即过期的代理对象     | ✅ `MIN_PROXY_DURATION_MS` 最短 1 小时守卫                                                                                                                                                     |
| **自代理**                                    | `activate_proxy(proxy=self)` 设定过期时间后写入异常        | ✅ `assert!(proxy_wallet != ctx.sender(), EProxySelf)`                                                                                                                                         |

---

## 6. Codegen 流水线 v2

### 6.1 Config 变化

现有 `dubhe.config.ts` schema **不需要改动**。`global` 字段是将资源路由到正确存储层的唯一判断依据。

```typescript
// 大多数 DApp 无需修改 config
export const dubheConfig = {
  name: 'rpg',
  resources: {
    game_config: { global: true, fields: { max_level: 'u32' } }, // → DappStorage
    character: { global: false, fields: { hp: 'u64', level: 'u32' } }, // → UserStorage
    inventory: { offchain: true, fields: { item_id: 'u32' } } // → 仅 Event
  }
} as DubheConfig;
```

### 6.2 生成的函数签名 v2

**非 global 资源（用户数据）— 热路径，owned 对象：**

```move
// v1 生成
public(package) fun set(
    dapp_hub: &mut DappHub,
    resource_account: String,
    hp: u64, level: u32,
    ctx: &mut TxContext
)

// v2 生成（只有 UserStorage，无 SessionQuota）
public(package) fun set(
    user_storage: &mut UserStorage,    // owned：数据写入 + write_count++
    hp: u64, level: u32,
    ctx: &mut TxContext
)
// canonical_owner = user_storage.canonical_owner（不再是参数）
```

**Global 资源（DApp 级别单例）— 低频，DappStorage：**

```move
// v2 生成（语义与 v1 相同，对象换成 DappStorage）
public(package) fun set(
    dapp_storage: &mut DappStorage,
    max_level: u32,
    ctx: &mut TxContext
)
```

**Offchain 资源 — 仅 Event，基本不变：**

```move
// v2 生成
public(package) fun set(
    user_storage: &UserStorage,    // 只读：提供 dapp_key 和 canonical_owner
    item_id: u32,
    ctx: &mut TxContext
) {
    // [H4] 使用 canonical_owner 标识数据归属，代理场景下归属不变
    emit_set_record(user_storage.dapp_key, user_storage.canonical_owner, key, value);
}
```

### 6.3 genesis.move 变化

v2 生成的 `genesis::init` 同时创建 `DappHub` 和 `DappStorage`：

```move
fun init(ctx: &mut TxContext) {
    // 创建全局 DappHub（框架部署时一次性创建）
    let dapp_hub = dapp_service::new_dapp_hub(ctx);
    transfer::public_share_object(dapp_hub);

    // create_dapp 同时创建并 share DappStorage<DappKey>
    dapp_system::create_dapp<DappKey>(&mut dapp_hub, NAME, DESC, clock, ctx);
    // 内部：创建 DappStorage，调用 transfer::public_share_object(dapp_storage)
}
```

### 6.4 用户初始化模板（新增）

Codegen 在 DApp 的系统模块中生成 `create_user_storage` 入口。

**注意：** 必须传入 `&DappStorage` 以检查 DApp 是否处于悬停状态（suspended）。用户注册是一次性操作，走共识完全可接受，不影响热路径。

```move
// codegen 自动生成
public fun create_user_storage<DappKey>(
    dapp_storage: &DappStorage,   // [H3] 只读，检查 DApp 是否已被悬停
    ctx: &mut TxContext
) {
    // 若 DApp 欠债过多已被悬停，拒绝新用户注册
    assert!(!dapp_fee_state::is_suspended(dapp_storage), EDappSuspended);

    // 验证 DappStorage 归属（防止传入其他 DApp 的 storage）
    assert!(
        dapp_storage.dapp_key == type_name::get<DappKey>().into_string(),
        EDappKeyMismatch
    );

    let user_storage = dapp_service::new_user_storage<DappKey>(ctx);
    transfer::transfer(user_storage, ctx.sender());
}
```

用户在首次与 DApp 交互前调用一次。SDK 会自动处理这一步（`ensureUserStorage` 内部自动传入 `dappStorageId`）。

### 6.5 版本守卫的变化

v1 中每个系统函数都需要显式调用 `ensure_latest_version`（读 DappHub，共识路径）。  
v2 中版本守卫**移至 DApp 系统函数层**，框架的 `set_record` 不再强制版本检查。

```move
// v1
public fun move_player(dh: &mut DappHub, dapp_key: DappKey, ctx: &mut TxContext) {
    dapp_system::ensure_latest_version<DappKey>(dh, migrate::on_chain_version()); // 读 shared
    // ...
}

// v2（DApp 开发者按需选择是否加版本守卫）
public fun move_player(
    dapp_storage: &DappStorage,    // 只读（可选，若不需要版本检查可省略）
    user_storage: &mut UserStorage,
    ctx: &mut TxContext
) {
    // 可选：DApp 自己决定是否检查版本
    // dapp_system::assert_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());

    // 直接调用 framework 写入（框架层不做版本检查）
    character::set(user_storage, new_hp, new_level, ctx);
}
```

**admin 函数和 global 资源写入**，仍需显式守卫：

```move
public fun admin_set_config(dapp_storage: &mut DappStorage, ctx: &mut TxContext) {
    dapp_system::ensure_dapp_admin(dapp_storage, ctx.sender());
    game_config::set(dapp_storage, new_max_level, ctx);
}
```

---

## 7. Client SDK v2

### 7.1 新增对象感知能力

SDK 需要管理三类对象（v1 只有一个 DappHub）：

```typescript
interface DubheClientConfig {
  network: Network;
  packageId: string;
  metadata: SuiMoveNormalizedModules;

  // v2 新增必填项
  dappHubId: string; // 全局 DappHub（v1 已有，不变）
  dappStorageId: string; // Per-DApp DappStorage（v2 新增）

  // v2 自动从用户钱包发现（无需手动配置）
  // userStorageId 由 SDK 在用户连接钱包时自动查询和缓存
}
```

### 7.2 用户对象自动发现与初始化

SDK 自动为已连接的钱包发现 `UserStorage`，不存在时自动创建。

**[M4] 代理场景下的缓存策略：** 代理激活后 `UserStorage` 的 Sui 对象 owner 发生变化。SDK 不能无限期信任缓存——每次 `execute` 前必须验证缓存对象的实际 owner 是否仍为当前地址，一旦不匹配则使缓存失效并重新查询。

```typescript
class DubheClient {
  // [M4] 缓存结构扩展：记录上次验证时间，定期重验证
  private userStorageCache: Map<string, { objectId: string; verifiedAt: number }> = new Map();
  private CACHE_VERIFY_INTERVAL_MS = 60_000; // 每 60 秒重验证一次所有权

  // 查询用户持有的 UserStorage（代理感知：按实际 Sui owner 查询）
  async getUserStorage(userAddress: string): Promise<string | null> {
    const cached = this.userStorageCache.get(userAddress);
    const now = Date.now();

    // 缓存有效且未到重验证期
    if (cached && now - cached.verifiedAt < this.CACHE_VERIFY_INTERVAL_MS) {
      return cached.objectId;
    }

    // 重新查询：按当前钱包地址查 owned objects
    const objects = await suiClient.getOwnedObjects({
      owner: userAddress,
      filter: { StructType: `${frameworkPackageId}::dapp_service::UserStorage` }
    });
    const obj = objects.find((o) => o.data?.content?.fields?.dapp_key === this.dappKey);
    const id = obj?.data?.objectId ?? null;

    if (id) {
      this.userStorageCache.set(userAddress, { objectId: id, verifiedAt: now });
    } else {
      // 对象不在此地址下（可能已被代理转走），清除旧缓存
      this.userStorageCache.delete(userAddress);
    }
    return id;
  }

  // 代理归还后主动清缓存，避免残留旧 objectId
  invalidateUserStorageCache(address: string) {
    this.userStorageCache.delete(address);
  }

  // 钱包连接时调用 — 若 UserStorage 不存在则自动在首次交易中创建
  async ensureUserStorage(): Promise<string> {
    const existing = await this.getUserStorage(this.address);
    if (existing) return existing;

    // 首次使用：在第一笔交易前插入 create_user_storage（传入 dappStorageId 供合约检查 suspended）
    const tx = new Transaction();
    this.contract.tx.dapp_system.create_user_storage({
      tx,
      arguments: [tx.object(this.dappStorageId)]
    });
    await this.executeTransaction(tx);

    return (await this.getUserStorage(this.address))!;
  }
}
```

### 7.3 交易参数自动注入

SDK 检查函数签名，自动注入 `UserStorage` 对象 ID，DApp 开发者无感知：

```typescript
// DApp 开发者只需写：
await dubhe.execute([dubhe.tx.player_system.move_player(direction)]);

// SDK 内部自动处理：
// 1. 检查 move_player 签名，发现需要 UserStorage
// 2. 查询/创建 UserStorage
// 3. 检查是否需要结算（自动插入 settle_writes）
// 4. 构建完整 PTB 并执行
const ptb = new Transaction();
ptb.moveCall({
  target: `${packageId}::player_system::move_player`,
  arguments: [
    ptb.object(userStorageId), // 自动注入，开发者无需手动传
    ptb.pure.u8(direction)
  ]
});
```

### 7.4 结算自动化（替代 Session 管理）

SDK 根据 `write_count - settled_count` 阈值，自动将结算步骤打包进每笔 PTB：

```typescript
class DubheClient {
  // 阈值配置（DApp 开发者可调整）
  private SETTLE_THRESHOLD = 50; // 每 50 次写入结算一次
  private SETTLE_INTERVAL_MS = 3_600_000; // 或每 1 小时结算一次

  // [L2] lastSettleTime 持久化到 localStorage，避免页面刷新后每次都触发结算
  private get lastSettleTime(): number {
    return parseInt(
      localStorage.getItem(`dubhe:lastSettle:${this.dappKey}:${this.address}`) ?? '0'
    );
  }
  private set lastSettleTime(t: number) {
    localStorage.setItem(`dubhe:lastSettle:${this.dappKey}:${this.address}`, String(t));
  }

  // 核心执行函数：DApp 开发者唯一需要调用的接口
  async execute(actions: MoveCallAction[]): Promise<SuiTransactionResponse> {
    const userStorageId = await this.ensureUserStorage();
    const ptb = new Transaction();

    // 自动检查是否需要结算
    if (await this.shouldSettle(userStorageId)) {
      ptb.moveCall({
        target: `${FRAMEWORK_PKG}::dapp_system::settle_writes`,
        arguments: [
          ptb.object(this.dappHubId), // &DappHub（只读，获取当前费率）
          ptb.object(this.dappStorageId), // &mut DappStorage（扣减信用池）
          ptb.object(userStorageId) // &mut UserStorage（更新 settled_count）
        ]
      });
      this.lastSettleTime = Date.now();
    }

    // 注入用户动作
    for (const action of actions) {
      ptb.moveCall({
        ...action,
        arguments: this.injectUserStorage(action.arguments, userStorageId)
      });
    }

    return this.executeTransaction(ptb);
  }

  private async shouldSettle(userStorageId: string): Promise<boolean> {
    const obj = await suiClient.getObject({ id: userStorageId, options: { showContent: true } });
    const fields = obj.data?.content?.fields as any;
    const unsettled = Number(fields.write_count) - Number(fields.settled_count);
    const timeExceeded = Date.now() - this.lastSettleTime > this.SETTLE_INTERVAL_MS;

    // Proactive settlement: trigger at 80% of framework debt limit (200) to prevent
    // users from hitting EUserDebtLimitExceeded when DApp credit is temporarily low.
    // This ensures settlement is always attempted before writes start failing.
    const FRAMEWORK_MAX_UNSETTLED = 200;
    const nearDebtLimit = unsettled >= FRAMEWORK_MAX_UNSETTLED * 0.8; // 160 次

    return unsettled >= this.SETTLE_THRESHOLD || timeExceeded || nearDebtLimit;
  }
}
```

**用户视角：** 永远只签一笔交易。偶尔这笔交易会稍大一点（含结算步骤），但对用户完全透明。  
**DApp 开发者视角：** 调用 `dubhe.execute([...])` 即可，SDK 处理所有底层细节。

### 7.5 Published.toml v2

部署后生成的配置文件新增 DappStorage ID：

```toml
# Published.toml（v2）
package_id    = "0x..."
dapp_hub      = "0x..."   # 不变
dapp_storage  = "0x..."   # v2 新增
```

---

## 8. 迁移策略

### Phase 1 — DappStorage 隔离（破坏性，但影响范围有限）

**目标：** 隔离跨 DApp 干扰，每个 DApp 拥有独立的 shared object。

**变更内容：**

- 引入 `DappStorage` 结构体，将 `dapp_metadata`、`dapp_fee_state`、`proxy_config` 从 `DappHub` 迁出。
- `create_dapp` 创建并 share 一个 `DappStorage` 对象。
- `DappHub` 降级为注册表：`dapp_key → DappStorage.id`。
- 所有 `dapp_system` admin 函数参数从 `&mut DappHub` 改为 `&mut DappStorage`。
- Codegen global 资源使用 `&mut DappStorage`（语义相同，对象不同）。
- `proxy_system`（v1）废弃，Proxy 改由 `UserStorage` 所有权转移管理，无需 `DappStorage` 参与。

**DApp 开发者影响：**

- `genesis.move` 由 `schemagen` 自动重新生成。
- 调用 admin 守卫的系统函数需将 `dh` 参数改为 `dapp_storage`。
- **热路径（`set_record`/`set_field`）此阶段不变**，无需修改。

**TPS 提升：** 跨 DApp 干扰消除，DApp A 和 DApp B 可完全并行写入。

---

### Phase 2 — UserStorage（破坏性）

**目标：** 消除同 DApp 内用户串行化，用户数据迁移到 owned 对象。

**变更内容：**

- 引入 `UserStorage` 结构体（用户持有）。
- `dapp_service::set_record`/`set_field`/`delete_record`/`get_record` 接受 `&mut UserStorage`/`&UserStorage`。
- Codegen 非 global 资源签名更新，新增 `user_storage` 参数。
- SDK 自动发现并注入 `UserStorage` object ID。
- Codegen 新增 `create_user_storage` 入口函数。

**DApp 开发者影响：**

- 运行 `schemagen` 重新生成 resource 模块（签名变化）。
- 系统函数入口需新增 `user_storage: &mut UserStorage` 参数。
- `DappHub.accounts` 中的已有链上数据需要一次性迁移交易。

**TPS 提升：** 同 DApp 内所有用户可并行写入。费用扣减此阶段仍写 `DappStorage`（每次写入），Phase 3 解决。

---

### Phase 3 — 懒结算（破坏性，价值最高）

**目标：** 从热路径中移除最后一个 shared object 访问，同时保持用户无感知的自动收费。

**变更内容：**

- `UserStorage` 新增 `write_count` 和 `settled_count` 字段。
- `set_record`/`set_field` 只碰 `UserStorage`（owned），不再访问 `DappStorage`。
- 新增 `settle_writes(dapp_storage, user_storage)` 结算函数。
- SDK 自动将结算步骤打包进 PTB（对用户和 DApp 开发者透明）。
- 框架新增 `FrameworkFeeConfig` 统一管理费率。

**DApp 开发者影响：**

- 运行 `schemagen` 重新生成 resource 模块（签名变更：移除 `&mut DappStorage` 参数）。
- 不再需要关心 session 管理，SDK 全部自动处理。
- DApp admin 只需定期充值 credit，SDK 会在余额低时发出告警。

**TPS 提升：** 热路径 100% 为 owned 对象操作，零 shared object 访问，TPS 随 Sui validator 容量线性扩展。

---

### 迁移效果汇总

| 阶段       | 重点             | 跨 DApp TPS              | 同 DApp 用户 TPS       | 热路径 Shared Object                               |
| ---------- | ---------------- | ------------------------ | ---------------------- | -------------------------------------------------- |
| v1（当前） | —                | 1x（全局串行）           | 1x（全局串行）         | `&mut DappHub`（每次写入）                         |
| Phase 1    | DappStorage 隔离 | **Nx**（N 个 DApp 并行） | 1x（仍串行）           | `&mut DappStorage`（每次写入）                     |
| Phase 2    | UserStorage      | **Nx**                   | **Mx**（M 个用户并行） | `&mut DappStorage`（费用，每次写入）               |
| Phase 3    | 懒结算           | **Nx**                   | **Mx**                 | **无**（写入 fastpath；SDK 自动触发 settle，低频） |

---

## 9. 待决问题

以下设计决策在确定 v2 方案前需要进一步讨论。

### Q1：Session 机制 — 已废弃，改用懒结算

原 Q1 讨论 SessionQuota 的发放方式，现在已不适用。

v2 采用**懒结算模型**：用户无需管理任何 session，写入时只递增 `UserStorage.write_count`，SDK 自动批量结算。Session 相关的所有设计（`SessionQuota`、`AutoIssueCap`、`request_session`）均已移除。

**已确定，无需再讨论。**

---

### Q2：收费单位 — 已确定：按写入次数

懒结算模型中，热路径不做任何费率计算（否则需要在热路径中读取费率，引入 shared object 访问）。

**确定方案：按写入次数收费**

```
settlement_cost = unsettled_write_count * base_fee_per_write
```

- `base_fee_per_write`：框架统一设定（MIST/次），存储在 `FrameworkFeeConfig`
- 热路径只递增 `write_count`（整数加法，极低开销）
- 结算时统一按当前费率批量计算
- 按字节计费（v1 语义）在热路径是不可行的，因为需要在 fastpath 中计算数据大小和费率

**已确定，无需再讨论。**

---

### Q3：v1 数据迁移方案

v1 中已有用户数据存储在 `DappHub.accounts`，Phase 2 上线后需要迁移。

| 方案                | 描述                                                               | 风险                                    |
| ------------------- | ------------------------------------------------------------------ | --------------------------------------- |
| **A. 链上迁移交易** | DApp admin 调用迁移入口，逐个将 `AccountData` 移至新 `UserStorage` | gas 费用高；需要 admin 为每个用户操作   |
| **B. 懒迁移**       | 用户首次 v2 写入时触发内联迁移                                     | 无需 admin 操作；首次 v2 调用有额外延迟 |
| **C. 双读回退**     | v2 先读 `UserStorage`，未找到时回退读 `DappHub`                    | 无需迁移；读路径复杂度增加              |

**建议：** 方案 C 保证数据连续性；同时以方案 B 作为写入时触发的懒迁移机制，逐步消除回退路径。

---

### Q4：`UserStorage` 粒度 — Per-DApp vs Per-Table

| 方案                        | 描述                                                             |
| --------------------------- | ---------------------------------------------------------------- |
| **A. Per-DApp**（当前提案） | 每个用户每个 DApp 一个 `UserStorage`，所有 table 共用            |
| **B. Per-Table**            | 每种资源类型（如 `character`、`inventory`）各有独立的 owned 对象 |

方案 A 用户需管理的对象少，体验更简单。方案 B 支持更细粒度的数据共享（如将 `inventory` 授权给另一地址，而 `character` 保持私有），为 v3 跨 DApp 组合性铺路。

---

### Q5：跨 DApp 数据访问（v3 预留）

v1 中 DApp 间数据完全隔离（通过 `DappKey` 命名空间）。  
v2 中 `UserStorage` 由用户持有——用户是否可以授权 DApp B 读写自己在 DApp A 下的 `UserStorage`？

这将实现 DApp 组合性（例如：在 Game A 中制作的道具出现在 Game B 中），但需要一个新的访问控制层。**不纳入 v2 核心范围，记录为 v3 方向。**

---

_文档版本：1.0 — 待实现_  
_最后更新：2026-03-31_
