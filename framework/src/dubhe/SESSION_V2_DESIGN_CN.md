# Dubhe Framework Session V2 设计（落地版）

> English version: `SESSION_V2_DESIGN.md`

## 范围

本文描述 `framework/src/dubhe` 当前已经落地的 session 实现。

## 目标

1. 支持 owner 授权 delegate 执行写入。
2. 保证写入 subject 仍绑定 owner 账户/主体。
3. 防止 delegated write 被重放。
4. 支持会话时效与使用次数上限。
5. 在兼容旧接口的同时，提供更强约束的新接口。

## 当前架构

### 数据模型

Session 状态由 `session_cap::SessionCap` 对象承载，不是表行模型。

`SessionCap` 关键字段：

- `subject: SubjectId`
- `owner: address`
- `delegate: address`
- `scope_mask: u64`
- `expires_at_ms: u64`
- `version: u64`（来自 `SessionRegistry` 的 subject 级撤销版本）
- `revoked: bool`
- `max_uses: u64`（`create_session_cap` 下 `0` 表示不限次）
- `used_uses: u64`
- `next_nonce: u64`

### 撤销模型

- 点撤销：`session_cap::revoke` 将 `revoked = true`。
- subject 级撤销：`session_system::revoke_subject_sessions` 提升
  `SessionRegistry` 中 `(dapp_key, subject)` 版本，使旧 cap 失效。

## API 结构

### `session_cap`

- `create_session_cap`（不限次）
- `create_session_cap_with_limits`（要求 `max_uses > 0`）
- `ensure_can_write`
- `can_write_with_nonce` / `ensure_can_write_with_nonce`
- `consume_write_with_nonce`（鉴权 + nonce 校验后原子消耗）
- getters：`max_uses`、`used_uses`、`next_nonce`

### `session_system`

- 对创建/撤销做系统级封装
- 提供 `consume_write_with_nonce` 包装

### `dapp_system`

新增 nonce 保护写入口：

- `set_record_with_session_cap_nonce`
- `set_field_with_session_cap_nonce`
- `delete_record_with_session_cap_nonce`

旧的 `*_with_session_cap` 仍保留以兼容已有接入。

## 安全性质

1. **delegate 绑定**：仅 `delegate` 地址可使用 cap。
2. **scope 约束**：`(cap.scope_mask & op_mask) == op_mask`。
3. **TTL 约束**：过期后拒绝写入。
4. **撤销约束**：显式撤销与版本提升都会导致 cap 失效。
5. **重放保护**：必须满足 `expected_nonce == cap.next_nonce`。
6. **次数上限**：受限 session 在 `used_uses >= max_uses` 后失效。
7. **owner 资产归属**：写入使用 cap 的 `subject`，最终状态/资产归 owner subject。

## SDK 对接（`@0xobelisk/sui-client`）

`Dubhe` 提供高阶 helper，默认映射 nonce 保护入口：

- `getSessionCapNextNonce`
- `setRecordWithSessionCap`
- `setFieldWithSessionCap`
- `deleteRecordWithSessionCap`
- `clearSessionNonceCache`

当未传 `expectedNonce` 时，SDK 会先读取链上 nonce，并在本地按
`(frameworkPackageId, sessionCapId)` 维护 nonce 缓存。

## 测试覆盖

Move 测试覆盖包括：

1. owner 注册 delegate，delegate 写入成功，数据仍归 owner subject。
2. owner 不能直接使用绑定给 delegate 的 session。
3. use cap 生效（次数上限达到后不可继续写）。
4. 错误 nonce（重放/过期 nonce）会被拒绝。
5. 非法 `max_uses` 会被拒绝。
6. 既有 scope/revoke/version 隔离校验持续有效。

场景测试：

- `sources/tests/scenarios/session_flow.move`

核心 session 测试：

- `sources/tests/session_cap.move`

## 标准自检命令

在 `framework/src/dubhe` 下：

1. `make test`
2. `make test-session`
3. `sui move test session_flow_scenario_test`

在仓库根目录下：

1. `pnpm --filter @0xobelisk/sui-client type-check`
2. `pnpm --filter @0xobelisk/sui-client test:typecheck`

## Passkey + 临时密钥流程

推荐产品流程：

1. 主账户（例如 passkey 钱包）发起注册交易，创建绑定 delegate 地址的 `SessionCap`。
2. delegate 临时密钥使用 nonce 保护接口执行后续写交易。
3. 状态/资产归属仍绑定在 session cap 的 owner subject 上。
