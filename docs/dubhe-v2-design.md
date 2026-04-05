# Dubhe v2 — 架构设计文档

> 状态：**已实现** — 全部 202 个单元测试通过，可部署
> 范围：Framework 核心、Codegen 流水线、Client SDK
> 最后更新：2026-04-05

---

## 目录

1. [设计目标](#1-设计目标)
2. [v1 问题分析](#2-v1-问题分析)
3. [v2 对象模型](#3-v2-对象模型)
4. [性能设计 — 热路径写入](#4-性能设计--热路径写入)
5. [收费模型 v2 — 懒结算](#5-收费模型-v2--懒结算lazy-settlement)
6. [Session Key 机制](#6-session-key-机制)
7. [费率管理](#7-费率管理)
8. [Codegen 流水线 v2](#8-codegen-流水线-v2)
9. [Client SDK v2](#9-client-sdk-v2)
10. [安全性分析](#10-安全性分析)

---

## 1. 设计目标

| 目标                      | 说明                                                         |
| ------------------------- | ------------------------------------------------------------ |
| **最大吞吐量**            | 用户数据写入之间不应互相阻塞，无论是跨 DApp 还是同一 DApp 内 |
| **线性可扩展**            | 增加 DApp 数量或用户数量不应降低单用户 TPS                   |
| **DApp 开发者体验最小化** | 框架吸收复杂性，DApp 开发者看到简单的 API                    |
| **保留收费模型语义**      | DApp 为存储付费，用户不需要为每次写入单独付费                |
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

**影响：** 无论有多少 validator，TPS 都受限于共识吞吐量的上限。

### 2.2 每次写入都触碰瓶颈

每次 `set_record` / `set_field` 都在同一 shared object 上做费用扣减，使每笔交易的 shared object 写入压力翻倍。

### 2.3 版本检查强制走共识

每个系统入口的 `ensure_latest_version(dh, ...)` 读取 `DappHub`，即使是 `&DappHub`（只读）也强制走共识，无法使用 Sui fastpath。

### 2.4 v1 问题汇总

| 问题                         | 根本原因                           | 严重程度 |
| ---------------------------- | ---------------------------------- | -------- |
| 全局 TPS 上限                | 单一 shared DappHub                | 🔴 严重  |
| 每次写入都触碰 shared object | `charge_fee` 写 DappHub            | 🔴 严重  |
| 跨 DApp 相互干扰             | 所有 DApp 共享 DappHub             | 🔴 严重  |
| 版本检查强制走共识           | `ensure_latest_version` 读 DappHub | 🟠 高    |
| 用户数据无所有权             | 数据在 DappHub 的 ObjectTable 中   | 🟡 中    |
| Codegen 单一签名锁定         | 所有生成代码使用 DappHub           | 🟡 中    |

---

## 3. v2 对象模型

### 3.1 三层架构

```
┌──────────────────────────────────────────────────────────────────┐
│  第一层 · DappHub  [Shared · 全局唯一 · 近似不可变]               │
│                                                                  │
│  FrameworkFeeConfig:                                             │
│    · base_fee_per_write, bytes_fee_per_byte（当前生效费率）       │
│    · pending_base_fee, pending_bytes_fee（涨价延迟通道）          │
│    · fee_effective_at_ms（新费率生效时间）                        │
│    · treasury（手续费接收地址）                                   │
│    · fee_history（滚动历史，最多 20 条）                          │
│                                                                  │
│  FrameworkConfig:                                                │
│    · admin（框架管理员，可二步轮换）                               │
│    · pending_admin（待确认的新管理员）                             │
│    · default_free_credit（新 DApp 的默认免费额度）                │
│    · default_free_credit_duration_ms（免费额度有效期）            │
│                                                                  │
│  写入：create_dapp（一次性）、update_framework_fee（极低频）       │
└──────────────────────────────┬───────────────────────────────────┘
                               │ create_dapp 时为每个 DApp 创建一次
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  第二层 · DappStorage  [Shared · Per-DApp]                        │
│                                                                  │
│  元数据：dapp_key, name, description, admin, version,            │
│          package_ids, cover_url, partners, paused                │
│                                                                  │
│  费率（继承自 DappHub 默认值，可由 admin 单独设置）：              │
│    · base_fee_per_write（per-DApp 写入基础费率）                  │
│    · bytes_fee_per_byte（per-DApp 字节费率）                      │
│                                                                  │
│  信用池：                                                         │
│    · free_credit（框架赠送的虚拟额度，优先消耗）                   │
│    · free_credit_expires_at（免费额度到期时间，0=永不过期）        │
│    · credit_pool（DApp admin 充值的 SUI 余额，MIST）              │
│    · min_credit_to_unsuspend（恢复服务所需最低信用额）             │
│    · suspended（欠费悬停标志）                                     │
│    · total_settled（已结算的累计付费金额，MIST）                   │
│                                                                  │
│  写入：admin 操作、升级、settle_writes 结算（低频）               │
│  全局写入：set_global_record / set_global_field（即时扣费）        │
└──────────────────────────────┬───────────────────────────────────┘
                               │ 用户每个 DApp 首次注册时创建一次
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  第三层 · UserStorage  [Shared · 热路径]                          │
│                                                                  │
│  · dapp_key: String             — DApp 命名空间                  │
│  · canonical_owner: address     — 数据归属地址（永不改变）        │
│  · session_wallet: address      — 当前授权的 Session Key 地址    │
│  · session_expires_at: u64      — Session 过期时间（0=无 Session）│
│  · write_count: u64             — 累计写入次数（热路径递增）      │
│  · settled_count: u64           — 已结算写入次数（结算时更新）    │
│  · write_bytes: u256            — 累计写入字节数（链上写入才计）  │
│  · settled_bytes: u256          — 已结算字节数（结算时更新）      │
│  · dynamic_field[key]           — 该用户在该 DApp 下的业务数据   │
│                                                                  │
│  写入：所有用户业务数据写入 + 计数（已注册为 Shared Object）      │
└──────────────────────────────────────────────────────────────────┘
```

> **注意：** `UserStorage` 在 v2 实现中是 **Shared Object**（而非 Owned），但通过 `canonical_owner` / `session_wallet` 双重权限校验保证只有授权方可以写入。这避免了 Proxy 需要转移所有权的复杂性，同时保持了用户数据的可访问性。

### 3.2 对象所有权汇总

| 对象          | 所有者                  | 写入频率                |
| ------------- | ----------------------- | ----------------------- |
| `DappHub`     | Shared（全局唯一）      | 极低（框架 admin 操作） |
| `DappStorage` | Shared（per DApp）      | 低（admin + 结算）      |
| `UserStorage` | Shared（per DApp 注册） | 高（每次用户写入）      |

### 3.3 资源数据存储位置

| `dubhe.config.ts` 属性  | 存储位置                          | 写入模式             |
| ----------------------- | --------------------------------- | -------------------- |
| `global: true`          | `DappStorage`（shared，per-DApp） | 即时扣费（每次写入） |
| `global: false`（默认） | `UserStorage`（shared，per-user） | 懒结算（批量结算）   |
| `offchain: true`        | 仅 Event（无链上存储）            | 无费用               |

---

## 4. 性能设计 — 热路径写入

### 4.1 并发模型对比

```
── v1（全部串行）─────────────────────────────────────────────────

DApp_A 用户1 ──┐
DApp_A 用户2 ──┤
DApp_B 用户1 ──┼──→  &mut DappHub  ← 单一共识队列
DApp_B 用户2 ──┘

── v2（跨 DApp 并行，同 DApp 内部通过 UserStorage 并行）──────────

DApp_A 用户1 → &mut UserStorage_A1 ──┐ 并行 ✅
DApp_A 用户2 → &mut UserStorage_A2 ──┤ 并行 ✅
DApp_B 用户1 → &mut UserStorage_B1 ──┤ 并行 ✅
DApp_B 用户2 → &mut UserStorage_B2 ──┘ 并行 ✅
```

### 4.2 热路径写入实现

```move
// 框架常量：单个用户最大未结算写入次数
// 修改此值需要包升级（package upgrade），不支持链上动态配置
const MAX_UNSETTLED_WRITES: u64 = 1_000;

public fun set_record<DappKey: copy + drop>(
    _auth:        DappKey,         // DApp 包内部才能提供，防外部绕过
    user_storage: &mut UserStorage,
    key:          vector<vector<u8>>,
    field_names:  vector<vector<u8>>,
    values:       vector<vector<u8>>,
    offchain:     bool,
    ctx:          &mut TxContext,
) {
    // 1. DApp 命名空间校验（本地字符串比较）
    assert!(user_storage.dapp_key == type_name::get<DappKey>().into_string(), ...);

    // 2. 写权限校验：canonical_owner 或未过期的 session_wallet
    assert!(is_write_authorized(user_storage, ctx.sender(), ctx.epoch_timestamp_ms()), ...);

    // 3. 未结算写入上限：防止 DApp 不结算导致无限欠债
    assert!(unsettled_count(user_storage) < MAX_UNSETTLED_WRITES, EUserDebtLimitExceeded);

    // 4. 写入数据（Dynamic Field）
    // 5. 递增计数（write_count++，链上写入还递增 write_bytes）
}
```

### 4.3 各操作的 Shared Object 访问对比

| 操作            | v1 访问                    | v2 访问                                               |
| --------------- | -------------------------- | ----------------------------------------------------- |
| 用户数据写入    | `&mut DappHub`（写，每次） | `&mut UserStorage`（shared，写，每次）                |
| 费用扣减        | `&mut DappHub`（写，每次） | **无**（write_count 在 UserStorage，结算时低频扣费）  |
| 全局数据写入    | `&mut DappHub`（写，每次） | `&mut DappStorage`（写，每次，即时扣费）              |
| 版本检查        | `&DappHub`（读，每次）     | `&DappStorage`（按需，DApp 开发者自行调用）           |
| Session 授权    | `&DappHub`（读，每次）     | UserStorage 内字段比较（本地，无 I/O）                |
| 费用结算        | 无（v1 即时扣费）          | `&DappHub` + `&mut DappStorage`（低频，SDK 自动批量） |
| DApp admin 升级 | `&mut DappHub`             | `&mut DappStorage`（隔离，不影响其他 DApp）           |
| DApp 注册       | `&mut DappHub`             | `&mut DappHub`（一次性）                              |

---

## 5. 收费模型 v2 — 懒结算（Lazy Settlement）

### 5.1 两组费率

v2 实现了双组件费率模型：

```
单次写入费用 = base_fee_per_write + bytes_fee_per_byte × 数据字节数
```

- `base_fee_per_write`：每次写入的基础费（MIST/次），无论数据大小
- `bytes_fee_per_byte`：链上写入的字节费（MIST/字节），offchain 写入不计字节费

**费率存储位置：**

- `DappHub.FrameworkFeeConfig`：框架级默认费率（admin 可更新）
- `DappStorage.base_fee_per_write` / `bytes_fee_per_byte`：per-DApp 实际使用费率

**DApp 创建时**，框架自动将当前 DappHub 有效费率复制到新的 DappStorage。

**框架 admin 调整全网费率的流程：**

1. 调用 `update_framework_fee(dh, new_base, new_bytes, clock, ctx)` 更新 DappHub 默认费率
2. 调用 `sync_dapp_fee<DappKey>(dh, ds)` 逐个 DApp 同步（permissionless，任何人可调用）
3. 或调用 `set_dapp_fee<DappKey>(dh, ds, base, bytes, ctx)` 为特定 DApp 设置差异化费率

### 5.2 懒结算全流程

```
用户每次 set_record() / set_field()
        │
        │  只碰 UserStorage，write_count++ 和 write_bytes+=N
        │  零 DappStorage / DappHub 访问
        ▼
UserStorage.write_count = N（未结算写入积累）
        │
        │  SDK 在后台检测触发条件：
        │  ① unsettled >= SETTLE_THRESHOLD（如 50 次）
        │  ② 距上次结算 > SETTLE_INTERVAL_MS（如 1 小时）
        │  ③ unsettled >= MAX_UNSETTLED_WRITES × 0.8（800 次，主动防触顶）
        ▼
settle_writes(&dh, &mut ds, &mut us, ctx)
        │
        │  1. 版本检查（DappHub.version == FRAMEWORK_VERSION）
        │  2. DappKey 双重校验（ds 和 us 均属于同一 DApp）
        │  3. 读取 DappStorage 中的费率
        │     cost = base_fee × unsettled_writes + bytes_fee × unsettled_bytes
        │  4. 优先消耗 free_credit（虚拟免费额度）
        │  5. 不足部分从 credit_pool 扣减（SUI）
        │  6. 支持部分结算（余额不足时尽量多结算）
        │  7. 余额耗尽时静默返回（emit SettlementSkipped，不 abort PTB）
        ▼
DappStorage.credit_pool 扣减 / UserStorage.settled_count 更新
```

### 5.3 结算信用优先级

```
结算时信用消耗顺序：

1. free_credit（框架赠送的虚拟额度，优先消耗）
   └── 若 now_ms >= free_credit_expires_at，视为 0（已过期）
   └── 0 过期时间 = 永不过期

2. credit_pool（DApp admin 充值的 SUI）
   └── 消耗后 total_settled += 实际付费金额
   └── free_credit 部分不计入 total_settled
```

### 5.4 全局写入（即时扣费）

`set_global_record` / `set_global_field` 写入 `DappStorage`，采用**即时扣费**模式：

```
charge_global_write(ds, data_bytes, ...) {
    charge = base_fee + bytes_fee × data_bytes
    优先消耗 free_credit，不足部分从 credit_pool 扣
    若 free_credit + credit_pool < charge → abort（insufficient_credit_error）
}
```

> 全局写入与用户写入的费率相同（均来自 DappStorage）。

### 5.5 免费信用系统

框架 admin 可向 DApp 发放虚拟免费额度，降低 DApp 初期运营成本：

```move
// 发放免费额度（可覆盖旧额度）
grant_free_credit<DappKey>(dh, ds, amount: u256, expires_at: u64, ctx)

// 撤销免费额度
revoke_free_credit<DappKey>(dh, ds, ctx)

// 仅延长有效期，不改变数量
extend_free_credit<DappKey>(dh, ds, new_expires_at: u64, ctx)
```

新 DApp 创建时自动获得 `DappHub.config.default_free_credit` 的初始赠送额度。

### 5.6 UserStorage 计费字段

```move
public struct UserStorage has key {
    id:                UID,
    dapp_key:          String,
    canonical_owner:   address,
    session_wallet:    address,      // Session Key 地址（@0x0 = 无 Session）
    session_expires_at: u64,         // Session 过期时间（0 = 无 Session）
    write_count:       u64,          // 累计写入次数
    settled_count:     u64,          // 已结算写入次数
    write_bytes:       u256,         // 累计写入字节数（链上写入才计）
    settled_bytes:     u256,         // 已结算字节数
    // dynamic fields: 业务数据
}
```

> `write_count - settled_count` = 待结算写入次数  
> `write_bytes - settled_bytes` = 待结算字节数

### 5.7 欠债上限与激励约束

```
MAX_UNSETTLED_WRITES = 1_000（框架常量，修改需要包升级）

用户未结算写入达到 1000 次时，后续写入 abort（EUserDebtLimitExceeded）
游戏对所有积累到上限的用户不可用
DApp admin 必须充值 credit + 触发结算才能恢复
```

这将"DApp 必须付费"从社会承诺提升为**技术强制约束**。

---

## 6. Session Key 机制

### 6.1 设计目标

游戏前端通常需要代表用户频繁签名交易（如每次移动）。让用户每次都使用主钱包签名体验极差。Session Key 允许用户临时授权一个游戏专用的临时密钥对进行写入，而主钱包保持安全。

### 6.2 实现模型：Session Key（而非所有权转移）

v2 采用 **Session Key 授权模型**，而非将 `UserStorage` 对象所有权转移给代理钱包：

```
UserStorage 始终由框架持有（Shared Object）

字段                          含义
─────────────────────────────────────────────────────────────
canonical_owner: address      数据归属（永不改变）
session_wallet:  address      当前授权的 session 地址（@0x0 = 无）
session_expires_at: u64       session 到期时间（epoch ms，0 = 无 session）
```

### 6.3 写权限校验逻辑

```move
fun is_write_authorized(us: &UserStorage, sender: address, now_ms: u64): bool {
    // canonical_owner 永远有权写入
    if (sender == us.canonical_owner) { return true };

    // session_wallet 在有效期内可以写入
    if (us.session_wallet != @0x0) {
        if (us.session_expires_at > 0 && now_ms >= us.session_expires_at) {
            return false  // session 已过期
        };
        return sender == us.session_wallet;
    };

    false
}
```

### 6.4 Session 生命周期管理

```move
// 有效期范围：1 分钟 ~ 7 天
const MIN_SESSION_DURATION_MS: u64 = 60_000;       // 1 分钟
const MAX_SESSION_DURATION_MS: u64 = 604_800_000;  // 7 天

// 激活 Session（canonical_owner 调用）
public fun activate_session<DappKey: copy + drop>(
    user_storage:   &mut UserStorage,
    session_wallet: address,
    duration_ms:    u64,
    clock:          &Clock,
    ctx:            &mut TxContext,
) {
    assert!(canonical_owner == ctx.sender(), ENotCanonicalOwner);
    assert!(session_wallet != @0x0, EInvalidSessionKey);
    assert!(duration_ms >= MIN_SESSION_DURATION_MS && duration_ms <= MAX_SESSION_DURATION_MS, ...);

    let expires_at = clock::timestamp_ms(clock) + duration_ms;
    us.session_wallet     = session_wallet;
    us.session_expires_at = expires_at;
}

// 撤销 Session（canonical_owner 调用）
public fun deactivate_session<DappKey: copy + drop>(
    user_storage: &mut UserStorage,
    ctx:          &TxContext,
) {
    assert!(canonical_owner == ctx.sender(), ENotCanonicalOwner);
    us.session_wallet     = @0x0;
    us.session_expires_at = 0;
}
```

### 6.5 与代理所有权转移模型的对比

| 维度       | Session Key（v2 实现）                | 所有权转移（设计草稿方案）  |
| ---------- | ------------------------------------- | --------------------------- |
| 对象模型   | UserStorage 保持 Shared               | UserStorage 临时转移给代理  |
| 人质风险   | ✅ 无（canonical_owner 始终可撤销）   | ⚠️ 代理私钥丢失则数据锁死   |
| 实现复杂度 | 低                                    | 高（所有权转移 + SDK 追踪） |
| 多 Session | ✅ 支持替换（调用一次覆盖旧 session） | ❌ 需先归还再转移           |
| 用户撤销   | 随时可调用 deactivate_session         | 依赖代理方主动归还          |

---

## 7. 费率管理

### 7.1 DappHub 框架级费率结构

```move
public struct FrameworkFeeConfig has store, drop {
    base_fee_per_write:     u256,   // 当前生效的基础写入费率（MIST/次）
    bytes_fee_per_byte:     u256,   // 当前生效的字节费率（MIST/字节）
    pending_base_fee:       u256,   // 待生效的涨价（基础费）
    pending_bytes_fee:      u256,   // 待生效的涨价（字节费）
    fee_effective_at_ms:    u64,    // 涨价生效时间（0 = 无待定）
    treasury:               address,
    pending_treasury:       address,
    fee_history:            vector<FeeHistoryEntry>,  // 最多 20 条
}
```

### 7.2 调价规则

| 操作         | 生效方式                           | 说明                              |
| ------------ | ---------------------------------- | --------------------------------- |
| 任一分量降价 | **立即生效**                       | 对 DApp admin 有利，无需延迟      |
| 任一分量涨价 | **48 小时延迟**                    | 给 DApp admin 时间充值            |
| 再次调价     | 先提交已到期的 pending，再应用新值 | 防止多次调价导致 pending 状态混乱 |

```move
const MIN_FEE_INCREASE_DELAY_MS: u64 = 172_800_000; // 48 小时

public fun update_framework_fee(
    dh:            &mut DappHub,
    new_base_fee:  u256,
    new_bytes_fee: u256,
    clock:         &Clock,
    ctx:           &mut TxContext,
)
```

### 7.3 有效费率查询

```move
// 按时间点查询有效费率（用于结算时确定实际费率）
public fun get_effective_fees_at(dh: &DappHub, now_ms: u64): (u256, u256)

// 使用当前 ctx 时间查询
public fun get_effective_fees(dh: &DappHub): (u256, u256)
```

### 7.4 Per-DApp 费率管理

```move
// 框架 admin 为特定 DApp 设置差异化费率（精准控制）
public fun set_dapp_fee<DappKey: copy + drop>(
    dh: &DappHub, ds: &mut DappStorage,
    base_fee: u256, bytes_fee: u256, ctx: &TxContext
)

// Permissionless：任何人可将 DApp 费率同步为 DappHub 当前有效费率
public fun sync_dapp_fee<DappKey: copy + drop>(dh: &DappHub, ds: &mut DappStorage)
```

**全网费率更新流程（框架 admin）：**

```
1. update_framework_fee(dh, new_base, new_bytes, clock, ctx)
   └── 降价立即生效；涨价 48h 后生效

2. 48h 后（或立即，若降价）：
   for each DApp:
       sync_dapp_fee<DappKey>(dh, ds)
   └── DAppStorage 的费率更新为 DappHub 当前有效值
   └── 此后 settle_writes 和 charge_global_write 均使用新费率
```

### 7.5 初始费率（deploy_hook）

```move
// framework/src/dubhe/sources/scripts/deploy_hook.move
dapp_system::initialize_framework_fee(
    dapp_hub,
    80_000,     // base_fee_per_write：0.00008 SUI / 次
    500,        // bytes_fee_per_byte：0.0000005 SUI / 字节
    ctx.sender(), // treasury
    ctx
);
```

---

## 8. Codegen 流水线 v2

### 8.1 Config 无需改动

现有 `dubhe.config.ts` schema 完全兼容：

```typescript
export const dubheConfig = defineConfig({
  name: 'rpg',
  resources: {
    game_config: { global: true, fields: { max_level: 'u32' } }, // → DappStorage（即时扣费）
    character: { fields: { hp: 'u64', level: 'u32' } }, // → UserStorage（懒结算）
    inventory: { offchain: true, fields: { item_id: 'u32' } } // → 仅 Event
  }
});
```

### 8.2 生成函数签名（v2 实现）

**用户数据（非 global）— 热路径，UserStorage：**

```move
// v1 旧签名（已废弃）
public(package) fun set(dapp_hub: &mut DappHub, ..., ctx: &mut TxContext)

// v2 当前签名：无 dapp_hub 参数
public(package) fun set(user_storage: &mut UserStorage, hp: u64, level: u32, ctx: &mut TxContext) {
    dapp_system::set_record<DappKey>(dapp_key::new(), user_storage, ..., ctx);
}
```

**全局数据（global: true）— DappStorage，即时扣费：**

```move
public(package) fun set(dapp_storage: &mut DappStorage, max_level: u32, ctx: &mut TxContext) {
    dapp_system::set_global_record<DappKey>(dapp_key::new(), dapp_storage, ..., ctx);
}
```

**Offchain 数据 — 仅 Event：**

```move
public(package) fun set(user_storage: &mut UserStorage, item_id: u32, ctx: &mut TxContext) {
    dapp_system::set_record<DappKey>(dapp_key::new(), user_storage, ..., /*offchain=*/true, ctx);
}
```

### 8.3 genesis.move（框架 genesis）

```move
// framework/src/dubhe/sources/codegen/genesis.move
public fun run(dapp_hub: &mut DappHub, ctx: &mut TxContext) {
    dubhe::deploy_hook::run(dapp_hub, ctx);
    // 初始化框架费率、注册 genesis
}
```

### 8.4 DApp genesis（schemagen 生成）

```move
// 由 schemagen 生成：DApp 的 genesis.move
public fun run(dapp_hub: &mut DappHub, clock: &Clock, ctx: &mut TxContext) {
    // 创建 DappStorage，自动继承 DappHub 当前费率
    let mut ds = dapp_system::create_dapp<DappKey>(
        DappKey{}, dapp_hub, NAME, DESC, clock, ctx
    );
    // 运行 DApp 自定义 deploy_hook（设置初始全局配置等）
    my_package::deploy_hook::run(&mut ds, ctx);
    // 发布为 Shared Object
    transfer::public_share_object(ds);
}
```

### 8.5 版本守卫

```move
// v1 旧方式（已废弃）
public fun move_player(dh: &mut DappHub, ...) {
    dapp_system::ensure_latest_version<DappKey>(dh, migrate::on_chain_version());
}

// v2 方式：框架 set_record 不做版本检查，DApp 系统函数按需自行加守卫
public fun move_player(dapp_storage: &DappStorage, user_storage: &mut UserStorage, ...) {
    // 可选，DApp 开发者决定是否需要版本检查
    dapp_system::ensure_latest_version<DappKey>(dapp_storage, migrate::on_chain_version());
    character::set(user_storage, new_hp, new_level, ctx);
}
```

### 8.6 框架版本门控

框架所有生命周期函数（`create_user_storage`、`settle_writes`、`suspend_dapp` 等）内部调用 `assert_framework_version(dh)`：

```move
const FRAMEWORK_VERSION: u64 = 1;

fun assert_framework_version(dh: &DappHub) {
    assert!(dapp_service::framework_version(dh) == FRAMEWORK_VERSION, ENotLatestVersion);
}
```

框架升级后调用 `migrate::run(dh, ctx)` 将 `DappHub.version` 递增。旧包的所有调用自动失败，强制所有调用方升级到新包。

---

## 9. Client SDK v2

### 9.1 对象配置

```typescript
interface DubheClientConfig {
  network: Network;
  packageId: string;
  metadata: SuiMoveNormalizedModules;

  dappHubId: string; // 全局 DappHub（v1 已有）
  dappStorageId: string; // Per-DApp DappStorage（v2 新增）
  // userStorageId 由 SDK 自动查询（按 dapp_key 过滤用户持有的 UserStorage）
}
```

### 9.2 用户对象初始化

```typescript
// SDK 在首次交互时自动创建 UserStorage
async ensureUserStorage(): Promise<string> {
    const existing = await getOwnedUserStorage(dappKey, sender);
    if (existing) return existing;

    const tx = new Transaction();
    contract.tx.dapp_system.create_user_storage({
        tx, arguments: [tx.object(dappStorageId), tx.object(dappHubId)]
    });
    await executeTransaction(tx);
    return getUserStorage(dappKey, sender);
}
```

### 9.3 自动结算打包

```typescript
const SETTLE_THRESHOLD    = 50;          // 每 50 次写入结算一次
const SETTLE_INTERVAL_MS  = 3_600_000;   // 或每 1 小时结算一次
const FRAMEWORK_MAX_WRITES = 1_000;      // 与合约 MAX_UNSETTLED_WRITES 对齐

async execute(actions: MoveCallAction[]) {
    const userStorageId = await ensureUserStorage();
    const ptb = new Transaction();

    // 检查是否需要结算
    const { write_count, settled_count } = await getUserStorageFields(userStorageId);
    const unsettled = write_count - settled_count;
    const needsSettle =
        unsettled >= SETTLE_THRESHOLD ||
        timeSinceLastSettle() > SETTLE_INTERVAL_MS ||
        unsettled >= FRAMEWORK_MAX_WRITES * 0.8;  // 800 次，主动防触顶

    if (needsSettle) {
        // 始终插入，链上处理信用不足（静默返回，不 abort PTB）
        ptb.moveCall({
            target: `${FRAMEWORK_PKG}::dapp_system::settle_writes`,
            arguments: [
                ptb.object(dappHubId),     // &DappHub（只读，版本检查）
                ptb.object(dappStorageId), // &mut DappStorage（扣费）
                ptb.object(userStorageId)  // &mut UserStorage（更新计数）
            ]
        });
        lastSettleTime = Date.now();
    }

    for (const action of actions) {
        ptb.moveCall({ ...action, arguments: injectUserStorage(action.arguments, userStorageId) });
    }

    return executeTransaction(ptb);
}
```

### 9.4 DApp 开发者接口（最终视角）

```typescript
// DApp 开发者只需写：
await dubhe.execute([dubhe.tx.game_system.move_player(direction)]);

// SDK 自动处理：
// · UserStorage 创建与发现
// · 结算步骤打包
// · UserStorage 参数注入
// · 交易提交

// 监听告警事件（可选）
dubhe.on('SettlementSkipped', ({ dapp_key, owner, unsettled }) =>
  notifyAdmin(`信用耗尽，${unsettled} 次写入待结算`)
);
dubhe.on('SettlementPartial', ({ settled, still_unsettled }) =>
  notifyAdmin(`部分结算：${settled} 已清，${still_unsettled} 仍待结算`)
);
```

### 9.5 Published.toml v2

```toml
# Published.toml（v2）
package_id    = "0x..."
dapp_hub      = "0x..."  # 全局 DappHub
dapp_storage  = "0x..."  # Per-DApp DappStorage（v2 新增）
```

---

## 10. 安全性分析

| 攻击 / 风险场景          | 分析                                              | 结论                                                                                            |
| ------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **DApp 拒绝结算**        | admin 控制前端，不插入 settle_writes              | ✅ write_count 达 1000 时写入失败，游戏崩溃，admin 被迫结算才能恢复                             |
| **无限写入耗尽信用池**   | 攻击者写大量数据                                  | ✅ 每用户最多 1000 次未结算写入；credit 耗尽后静默跳过，不 abort PTB                            |
| **write_count 伪造**     | 篡改 write_count 绕过结算                         | ✅ UserStorage 为 Shared，write_count 只由框架包内函数修改，外部无法调用                        |
| **settled_count 倒退**   | 将 settled_count 设回 0，重复收费                 | ✅ settled_count 在 settle_writes 中只能单调递增                                                |
| **跨 DApp 信用池攻击**   | 传入错误 dapp_storage 消耗其他 DApp 信用          | ✅ settle_writes 双重 dapp_key 校验（ds 和 us 均需匹配 `<DappKey>`）                            |
| **结算 PTB 竞态**        | 链下预检通过后链上信用耗尽导致 abort              | ✅ settle_writes 信用不足时静默返回，不 abort PTB；SDK 无需做信用预检                           |
| **涨价突袭**             | 框架涨价后存量欠债按新高费率结算                  | ✅ 涨价强制 48 小时延迟；降价立即生效对 DApp 有利                                               |
| **全局写入欠费**         | DApp 信用耗尽后调用 set_global_record             | ✅ charge_global_write 明确 assert 余额充足，不足则 abort（全局写入是 DApp admin 操作，可接受） |
| **Session Key 滥用**     | session_wallet 私钥泄漏                           | ✅ canonical_owner 随时可调用 deactivate_session 撤销；Session 有最长 7 天有效期                |
| **Session Key 人质**     | session_wallet 私钥丢失，session 期间用户无法写入 | ✅ v2 session key 模型下，canonical_owner 可以直接写入（不受 session 限制），无对象人质风险     |
| **版本绕过**             | 旧版合约绕过新逻辑                                | ✅ 框架所有生命周期函数通过 assert_framework_version 门控，upgrade 后旧包调用自动失败           |
| **DApp Key 冲突**        | 不同包使用相同 DappKey 类型名                     | ✅ create_dapp 一次性守卫（`is_dapp_genesis_done`），同 DappKey 只能创建一个 DappStorage        |
| **UserStorage 重复创建** | 用户丢弃有债务的 UserStorage，重建新的逃避结算    | ✅ create_user_storage 检查 DappStorage 注册表，同地址只能创建一个                              |

---

## 附录：关键常量与配置

| 常量 / 配置                       | 值                         | 修改方式                          |
| --------------------------------- | -------------------------- | --------------------------------- |
| `FRAMEWORK_VERSION`               | `1`                        | 包升级 + migrate::run             |
| `MAX_UNSETTLED_WRITES`            | `1_000`                    | 包升级                            |
| `MIN_SESSION_DURATION_MS`         | `60_000`（1 分钟）         | 包升级                            |
| `MAX_SESSION_DURATION_MS`         | `604_800_000`（7 天）      | 包升级                            |
| `MIN_FEE_INCREASE_DELAY_MS`       | `172_800_000`（48 小时）   | 包升级                            |
| `MAX_FEE_HISTORY`                 | `20` 条                    | 包升级                            |
| `deploy_hook base_fee_per_write`  | `80_000` MIST              | `update_framework_fee` 链上更新   |
| `deploy_hook bytes_fee_per_byte`  | `500` MIST                 | `update_framework_fee` 链上更新   |
| `default_free_credit`             | `25_000_000_000` MIST      | `update_default_free_credit` 更新 |
| `default_free_credit_duration_ms` | `15_778_800_000`（6 个月） | 同上                              |

---

## 附录：框架 Admin 操作速查

| 操作                 | 函数                                           | 权限                |
| -------------------- | ---------------------------------------------- | ------------------- |
| 更新框架费率         | `update_framework_fee(dh, base, bytes, clock)` | 框架 admin          |
| 设置 DApp 差异化费率 | `set_dapp_fee<K>(dh, ds, base, bytes)`         | 框架 admin          |
| 同步 DApp 费率       | `sync_dapp_fee<K>(dh, ds)`                     | Permissionless      |
| 发放免费额度         | `grant_free_credit<K>(dh, ds, amount, exp)`    | 框架 admin          |
| 撤销免费额度         | `revoke_free_credit<K>(dh, ds)`                | 框架 admin          |
| 延长免费额度有效期   | `extend_free_credit<K>(dh, ds, new_exp)`       | 框架 admin          |
| 悬停 DApp            | `suspend_dapp<K>(dh, ds)`                      | 框架 admin          |
| 恢复 DApp            | `unsuspend_dapp<K>(dh, ds)`                    | 框架 admin          |
| 提议新框架 admin     | `propose_framework_admin(dh, new_admin)`       | 框架 admin          |
| 接受框架 admin       | `accept_framework_admin(dh)`                   | 待确认的新 admin    |
| 提议新 treasury      | `propose_treasury(dh, new_treasury)`           | 当前 treasury       |
| 接受 treasury        | `accept_treasury(dh)`                          | 待确认的新 treasury |
| 更新默认免费额度配置 | `update_default_free_credit(dh, amount, dur)`  | 框架 admin          |

---

_文档版本：2.0 — 已实现_  
_最后更新：2026-04-05_
