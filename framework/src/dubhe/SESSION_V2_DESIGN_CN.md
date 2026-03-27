# Dubhe Framework Session V2 设计（中文）

> English version: `SESSION_V2_DESIGN.md`

## 范围

本设计面向 `framework/src/dubhe`，并与当前 `dapp_system + dapp_proxy + dapp_service` 架构保持一致。

## Framework 当前约束

1. `dapp_system::set_record / set_field / delete_record` 不接收 `TxContext`，因此无法在链上校验 sender 和 expiry。
2. 现有委托机制（`dapp_proxy`）是 dapp 级（`delegator + enabled`），不支持按账号粒度的 scope 或 expiry。
3. `set_storage` 虽然接收 `TxContext`，但参数里没有账号级语义。

## Session V2 目标

1. 支持账号粒度的写入委托。
2. 强制过期与撤销校验。
3. 保证所有 session 感知写 API 都要求显式链上 session 记录。
4. 最小化对外可调用的 legacy delegation 面。

## 数据模型

新增资源模块：`sources/codegen/resources/dapp_session.move`。

Key：`(dapp_key: String, account: String, delegate: address)`

Value 字段：

- `owner: String`（规范化 SUI sender hex，`0x` + 32-byte address）
- `scope_mask: u64`
- `expires_at_ms: u64`
- `revoked: bool`
- `nonce: u64`（为未来 meta-tx 流程预留）

Scope bits（初版）：

- `1`: set_record
- `2`: set_field
- `4`: delete_record
- `8`: set_storage

## 模块布局

1. 新增：`sources/codegen/resources/dapp_session.move`
2. 新增：`sources/systems/session_system.move`
3. 更新：`sources/systems/dapp_system.move`
4. 更新：`sources/codegen/errors.move`

## API 设计

### session_system

```move
public fun create_session<DappKey: copy + drop>(
  dh: &mut DappHub,
  account: String,
  delegate: address,
  scope_mask: u64,
  expires_at_ms: u64,
  ctx: &mut TxContext
)

public fun revoke_session<DappKey: copy + drop>(
  dh: &mut DappHub,
  account: String,
  delegate: address,
  ctx: &mut TxContext
)

public fun ensure_can_write<DappKey: copy + drop>(
  dh: &DappHub,
  account: String,
  op_mask: u64,
  ctx: &TxContext
)
```

行为约束：

1. 要求 `(dapp_key, account, ctx.sender())` 对应 session 存在（不允许直接绕过）。
2. 校验：`!revoked`、`tx_context::epoch_timestamp_ms(ctx) <= expires_at_ms`、`(scope_mask & op_mask) == op_mask`。
3. 在创建与运行时校验中都强制 `owner == account`，防止 signer 为任意 account 字符串铸造 session。
4. 在 `dapp_system::*_with_session` 中强制 session key 绑定：首个 storage key 必须与 `account` 的 BCS `String` 一致。
5. 创建 session 时强制最大 TTL（`30 days`）。
6. 在 `ensure_can_write` 中校验 operation mask，防止非法 mask 使用。
7. 创建 session 时 `account` 可等于规范化 SUI sender hex，或等于校验后的 `address_system::ensure_origin(ctx)`（包含 EVM-origin）；但落库 `owner` 仍为规范化 SUI sender hex。

### dapp_system

为在写路径强制 session，新增 `ctx + account` 感知版本：

```move
public fun set_record_with_session<DappKey: copy + drop>(
  dh: &mut DappHub,
  dapp_key: DappKey,
  table_id: String,
  account: String,
  key_tuple: vector<vector<u8>>,
  value_tuple: vector<vector<u8>>,
  offchain: bool,
  ctx: &mut TxContext
)
```

同理新增 `set_field_with_session`、`delete_record_with_session`、`set_storage_with_session`。

本实现中的可见性加固策略：

- `set_record/set_field/delete_record` 改为 `public(package)`。
- legacy 的 dapp 级 delegation API（`delegate/undelegate/is_delegated/set_storage`）也改为 `public(package)`，避免对外暴露两套认证模型。

## 错误码新增

在 `errors.move` 中新增：

- `SESSION_NOT_FOUND`
- `SESSION_EXPIRED`
- `SESSION_REVOKED`
- `SESSION_SCOPE_DENIED`
- `SESSION_INVALID_EXPIRY`

## 迁移计划

1. 新增 `dapp_session` 表模块，并在 genesis/init 中注册。
2. 新增 `session_system` 的 create/revoke/ensure 逻辑。
3. 在 `dapp_system` 中新增 `_with_session` 写 API。
4. 将 legacy 外部写入/委托 API 收敛为 `public(package)`。
5. 将外部集成迁移到仅使用 session-aware API。

## 测试

新增或扩展 Move 测试覆盖：

1. owner 无 session 写入失败。
2. delegate 在有效 session + scope 下写入成功。
3. delegate 在过期时写入失败。
4. delegate 在撤销后写入失败。
5. delegate 在 scope 不匹配时写入失败。
6. create 时拒绝非法 scope 和零地址 delegate。
7. 非 owner 不能 revoke session。
8. `(dapp_key, account, delegate)` 维度的多 session 隔离。

## 备注

1. 本设计暂不包含离线签名重放保护。
2. `nonce` 为预留字段，未来可在不变更存储结构的前提下接入 meta-tx。
3. 若 account 字符串为跨链格式，session key 前需先统一 canonicalization。

## 审计验证基线（2026-03-27）

2026-03-27 已验证执行结果：

1. `sui move test` => 默认 gas bound 下全量通过（`42/42`）。
2. `sui move test -i 200000000` => 审计 gas bound 下全量通过（`42/42`）。
3. `make test` => 使用 `SUI_TEST_GAS_LIMIT`（默认 `200000000`）全量通过（`42/42`）。
4. `make test-default-full` => 使用 `SUI_TEST_GAS_LIMIT`（默认 `200000000`）全量通过（`42/42`）。
5. `make test-fast` => 在 `SUI_TEST_GAS_LIMIT` 下，快速冒烟集（`address/assets/session`）通过。
6. `sui move test session_tests` => 全量通过（`14/14`）。
7. `sui move test dex_tests` => 全量通过（`7/7`）。
8. `sui move test wrapper_tests` => 全量通过（`1/1`）。

默认路径稳定性说明：

1. `dex_tests` 已规范为低状态不变量检查，使默认 `sui move test` 保持确定性并避免超时。
2. 审计运行保留 `-i 200000000`，为较慢 CI/开发机提供可复现余量。
3. `Makefile` 已暴露 `SUI_TEST_GAS_LIMIT` 用于本地/CI 统一控制，覆盖示例：
   `SUI_TEST_GAS_LIMIT=500000000 make test`。

标准化本地命令：

1. `make test`
2. `make test-fast`
3. `make test-audit`
4. `make test-session`
5. `make test-address`
6. `make test-native`（原生 `sui move test`，不显式传 gas-limit）

## 行业实践对标（2026-03-27）

在 Sui 生态的生产/开源实践中观察到：

1. 团队通常在 CI/脚本中通过 `--gas-limit` 或 `-i` 显式调参，而不是修改 Sui CLI 二进制默认值。
2. DeepBook V3 的 CI 在 workflow 自动化中执行 `sui move test --gas-limit 100000000000`。
3. Sui CLI 源码同时提供：
   - `--gas-limit <N>`
   - `-i, --instructions <N>`（`instruction_execution_bound`）
4. 未显式覆盖时，Sui 单测默认 bound 仍较保守（`1_000_000`）。

Dubhe 结论：

1. 保持上游 Sui 二进制不改动。
2. 在仓库级命令封装（`Makefile`）和 CI 环境中固定测试 gas limit。
3. 随测试规模增长，通过 `SUI_TEST_GAS_LIMIT=<N> make test` 提升审计/CI bound。
