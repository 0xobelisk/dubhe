# Dubhe Framework 学习指南

## 目录

1. [框架概述](#框架概述)
2. [架构设计](#架构设计)
3. [核心模块](#核心模块)
4. [关键特性](#关键特性)
5. [使用示例](#使用示例)
6. [模块依赖关系](#模块依赖关系)

---

## 框架概述

**Dubhe** 是一个基于 Sui Move 构建的综合性 DApp 开发框架，旨在为开发者提供在 Sui 区块链上构建去中心化应用的完整解决方案。

### 核心特点

- **多链支持**：原生支持 Sui、EVM 和 Solana 地址系统
- **灵活存储**：受 Entity-Component-System (ECS) 启发的数据存储模型
- **费用管理**：内置积分和计费机制的费用系统
- **版本控制**：DApp 版本管理和升级机制
- **权限系统**：细粒度访问控制和管理员管理

### 包信息

- **包名称**：Dubhe
- **版本**：1.0.0
- **许可证**：Apache 2.0
- **作者**：Obelisk Labs
- **Sui 框架版本**：mainnet-v1.46.3

---

## 架构设计

### 高层架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Dubhe 框架                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   系统层     │  │    核心层    │  │   代码生成   │      │
│  │   Systems    │  │     Core     │  │   Codegen    │      │
│  │              │  │              │  │              │      │
│  │ • dapp_      │  │ • dapp_      │  │ • resources  │      │
│  │   system     │  │   service    │  │ • genesis    │      │
│  │ • address_   │  │ • events     │  │ • errors     │      │
│  │   system     │  │ • keys       │  │ • dapp_key   │      │
│  │ • session_   │  │ • metadata   │  │              │      │
│  │   system     │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                     工具层 Utils                      │   │
│  │ • entity_id  • bcs  • type_info  • math             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心模块

### 1. DappHub (核心存储)

**位置**：`sources/core/dapp_service.move`

**功能**：所有 DApp 数据的中央存储中心，管理账户和记录。

#### 核心数据结构

```move
public struct DappHub has key, store {
    id: UID,
    accounts: ObjectTable<AccountKey, AccountData>,
}

public struct AccountKey has copy, drop, store {
    account: String,
    dapp_key: String,
}

public struct AccountData has key, store {
    id: UID
}
```

#### 核心函数

**设置记录**

```move
public(package) fun set_record<DappKey: copy + drop>(
    self: &mut DappHub,
    _: DappKey,
    key: vector<vector<u8>>,
    value: vector<vector<u8>>,
    account: String,
    offchain: bool,
    ctx: &mut TxContext,
)
```

- 为特定账户存储数据记录
- 支持链上和链下（仅事件）存储
- 使用动态字段实现灵活的数据存储

**获取记录**

```move
public fun get_record<DappKey: copy + drop>(
    self: &DappHub,
    account: String,
    key: vector<vector<u8>>
): vector<u8>
```

- 检索账户的存储数据
- 返回所有字段的连接字节向量

**设置字段**

```move
public(package) fun set_field<DappKey: copy + drop>(
    self: &mut DappHub,
    _: DappKey,
    key: vector<vector<u8>>,
    field_index: u8,
    field_value: vector<u8>,
    account: String,
)
```

- 更新记录中的单个字段
- 比更新整个记录更高效

**删除记录**

```move
public(package) fun delete_record<DappKey: copy + drop>(
    self: &mut DappHub,
    _: DappKey,
    key: vector<vector<u8>>,
    account: String,
): vector<vector<u8>>
```

- 从存储中删除记录
- 触发删除事件

---

### 2. DApp 系统 (业务逻辑)

**位置**：`sources/systems/dapp_system.move`

**功能**：高层 DApp 管理，包括创建、升级和费用收取。

#### 关键功能

**DApp 创建**

```move
public fun create_dapp<DappKey: copy + drop>(
    dh: &mut DappHub,
    dapp_key: DappKey,
    name: String,
    description: String,
    clock: &Clock,
    ctx: &mut TxContext
)
```

- 使用元数据初始化新 DApp
- 设置初始积分的费用状态
- 注册包 ID 进行版本控制

**DApp 升级**

```move
public(package) fun upgrade_dapp<DappKey: copy + drop>(
    dh: &mut DappHub,
    new_package_id: address,
    new_version: u32,
    ctx: &mut TxContext
)
```

- 将新包 ID 添加到允许列表
- 增加版本号
- 需要管理员权限

**费用收取**

```move
public(package) fun charge_fee(
    dh: &mut DappHub,
    dapp_key: String,
    key: vector<vector<u8>>,
    value: vector<vector<u8>>,
    count: u256,
    ctx: &mut TxContext
)
```

- 根据数据大小计算费用
- 公式：`(bytes_size * byte_fee + base_fee) * count`
- 先从免费积分扣除，然后从充值余额扣除

**权限管理**

```move
public fun set_pausable(
    dh: &mut DappHub,
    dapp_key: String,
    pausable: bool,
    ctx: &mut TxContext
)

public fun transfer_ownership(
    dh: &mut DappHub,
    dapp_key: String,
    new_admin: address,
    ctx: &mut TxContext
)
```

---

### 3. 地址系统 (跨链支持)

**位置**：`sources/systems/address_system.move`

**功能**：处理多链地址转换和检测。

#### 支持的链

- **SUI**：原生 Sui 地址（32 字节）
- **EVM**：以太坊兼容地址（20 字节）
- **Solana**：Solana 地址（32 字节，Base58 编码）

#### 链检测

使用交易哈希签名检测链类型：

```
格式：[0xDB][0xDB][0x01][CHAIN_TYPE][...28 bytes...]
```

- `0xDB 0xDB`：Dubhe 前缀标记
- `0x01`：版本
- `0xE1`：EVM 链
- `0xE2`：Solana 链
- 其他：Sui 链

#### 核心函数

**EVM 转 Sui 转换**

```move
public fun evm_to_sui(evm_address_str: String): address
```

- 将 20 字节 EVM 地址转换为 32 字节 Sui 地址
- 在开头填充 12 个零字节
- 格式：`[12 个零字节][20 字节 EVM 地址]`

**Solana 转 Sui 转换**

```move
public fun solana_to_sui(solana_address_str: String): address
```

- 将 Base58 Solana 地址解码为字节
- 直接用作 Sui 地址（都是 32 字节）

**获取原始地址**

```move
public fun ensure_origin(ctx: &TxContext): String
```

- 从交易中检测链类型
- 返回原始格式的地址：
  - EVM：十六进制字符串（不带 0x 前缀）
  - Solana：Base58 字符串
  - Sui：十六进制字符串

**链类型检查**

```move
public fun is_evm_address(ctx: &TxContext): bool
public fun is_solana_address(ctx: &TxContext): bool
public fun is_sui_address(ctx: &TxContext): bool
```

---

### 4. 费用管理系统

#### DappFeeConfig (全局配置)

**位置**：`sources/codegen/resources/dapp_fee_config.move`

```move
public struct DappFeeConfig has copy, drop, store {
    free_credit: u256,    // 新 DApp 的初始免费积分
    base_fee: u256,       // 每次操作的基础费用
    byte_fee: u256,       // 每字节数据的费用
}
```

**默认值**（来自 deploy_hook）：

- `free_credit`：10,000,000,000（相当于 10 SUI）
- `base_fee`：80,000
- `byte_fee`：500

#### DappFeeState (每个 DApp 的跟踪)

**位置**：`sources/codegen/resources/dapp_fee_state.move`

```move
public struct DappFeeState has copy, drop, store {
    base_fee: u256,           // 当前基础费用
    byte_fee: u256,           // 当前字节费用
    free_credit: u256,        // 剩余免费积分
    total_bytes_size: u256,   // 总存储字节数
    total_recharged: u256,    // 总充值积分
    total_paid: u256,         // 总支付费用
    total_set_count: u256,    // 总设置操作次数
}
```

**费用计算**：

```
total_fee = (total_bytes_size * byte_fee + base_fee) * operation_count
```

**扣费优先级**：

1. 免费积分（如果可用）
2. 充值余额（如果免费积分用完）
3. 余额不足时报错

---

### 5. DApp 元数据

**位置**：`sources/codegen/resources/dapp_metadata.move`

```move
public struct DappMetadata has copy, drop, store {
    name: String,                   // DApp 名称
    description: String,            // DApp 描述
    website_url: String,            // 网站 URL
    cover_url: vector<String>,      // 封面图片
    partners: vector<String>,       // 合作伙伴列表
    package_ids: vector<address>,   // 允许的包 ID
    created_at: u64,                // 创建时间戳
    admin: address,                 // 管理员地址
    version: u32,                   // 当前版本
    pausable: bool,                 // 暂停状态
}
```

**用途**：

- 存储 DApp 信息和配置
- 跟踪允许的包版本
- 管理管理员权限
- 控制暂停/恢复功能

---

### 6. 事件系统

**位置**：`sources/core/events.move`

#### 存储设置记录事件

```move
public struct Dubhe_Store_SetRecord has copy, drop {
    dapp_key: String,
    account: String,
    key: vector<vector<u8>>,
    value: vector<vector<u8>>
}
```

- 在存储数据时触发
- 支持链下索引
- 支持链上和链下模式

#### 存储删除记录事件

```move
public struct Dubhe_Store_DeleteRecord has copy, drop {
    dapp_key: String,
    account: String,
    key: vector<vector<u8>>
}
```

- 在删除数据时触发
- 跟踪数据生命周期

---

## 关键特性

### 1. 灵活的数据存储

**ECS 启发的模型**：

- **账户**：由 `(account_string, dapp_key)` 对标识
- **记录**：存储为动态字段的键值对
- **字段**：记录中的各个组件

**存储模式**：

- **链上**：数据存储在 Sui 对象中
- **链下**：仅触发事件（用于索引器）

**示例流程**：

```
1. 创建账户键：(account_address, dapp_type_name)
2. 创建账户数据：带有 UID 的新对象
3. 添加动态字段：(key_tuple, value_tuple)
4. 触发事件：用于索引器同步
```

### 2. 类型安全的 DApp 键

**DappKey 模式**：

```move
public struct DappKey has copy, drop {}
```

**用途**：

- 每个 DApp 定义自己的唯一键类型
- 提供 DApp 之间的编译时隔离
- 类型名称用作字符串标识符

**使用方法**：

```move
// 获取 DApp 键字符串
let dapp_key_str = type_name::get<MyDappKey>().into_string();

// 获取包 ID
let package_id = type_name::get<MyDappKey>().get_address();
```

### 3. 动态数据架构

**表元数据**：

```move
public struct TableMetadata has store {
    type_: String,              // 表类型标识符
    key_schemas: vector<String>,    // 键字段类型
    key_names: vector<String>,      // 键字段名称
    value_schemas: vector<String>,  // 值字段类型
    value_names: vector<String>,    // 值字段名称
    offchain: bool,                 // 存储模式
}
```

**优势**：

- 运行时架构定义
- 支持每个 DApp 多种表类型
- 清晰分离键和值

### 4. 多链地址支持

**统一地址表示**：

- 所有地址在内部转换为 32 字节 Sui 格式
- 通过 `ensure_origin()` 保留并返回原始格式
- 支持跨链 DApp 开发

**使用场景**：

- 来自不同链的用户账户
- 跨链资产跟踪
- 通用身份系统

### 5. 版本管理

**升级流程**：

1. 部署新包版本
2. 使用新包 ID 和版本调用 `upgrade_dapp()`
3. 框架验证版本增量
4. 新包 ID 添加到允许列表

**版本检查**：

```move
public fun ensure_latest_version<DappKey: copy + drop>(
    dh: &DappHub,
    version: u32
)
```

- 防止使用旧包
- 实现平滑升级

### 6. 权限系统

**管理员操作**：

- 暂停/恢复 DApp
- 转移所有权
- 更新元数据
- 升级包
- 设置费用配置

**访问控制**：

```move
public fun ensure_dapp_admin<DappKey: copy + drop>(
    dh: &DappHub,
    admin: address
)
```

---

## 使用示例

### 示例 1：创建新 DApp

```move
module my_project::my_dapp {
    use dubhe::dapp_system;
    use dubhe::dapp_service::DappHub;
    use sui::clock::Clock;
    use std::ascii::string;

    // 定义你的 DApp 键
    public struct MyDappKey has copy, drop {}

    // 初始化你的 DApp
    public entry fun initialize(
        dapp_hub: &mut DappHub,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let dapp_key = MyDappKey {};
        dapp_system::create_dapp(
            dapp_hub,
            dapp_key,
            string(b"My DApp"),
            string(b"An awesome decentralized application"),
            clock,
            ctx
        );
    }
}
```

### 示例 2：存储和检索数据

```move
module my_project::storage_example {
    use dubhe::dapp_system;
    use dubhe::dapp_service::DappHub;
    use std::ascii::string;

    public struct MyDappKey has copy, drop {}

    // 存储用户数据
    public entry fun save_user_profile(
        dapp_hub: &mut DappHub,
        user_address: String,
        name: vector<u8>,
        age: vector<u8>,
        ctx: &mut TxContext
    ) {
        let dapp_key = MyDappKey {};

        // 准备键：表名
        let mut key_tuple = vector::empty();
        key_tuple.push_back(b"user_profile");

        // 准备值：[name, age]
        let mut value_tuple = vector::empty();
        value_tuple.push_back(name);
        value_tuple.push_back(age);

        // 存储到链上
        dapp_system::set_record(
            dapp_hub,
            dapp_key,
            key_tuple,
            value_tuple,
            user_address,
            false, // 链上存储
            ctx
        );
    }

    // 检索用户数据
    public fun get_user_profile(
        dapp_hub: &DappHub,
        user_address: String,
    ): vector<u8> {
        let mut key_tuple = vector::empty();
        key_tuple.push_back(b"user_profile");

        dapp_system::get_record<MyDappKey>(
            dapp_hub,
            user_address,
            key_tuple
        )
    }

    // 更新特定字段
    public entry fun update_user_age(
        dapp_hub: &mut DappHub,
        user_address: String,
        new_age: vector<u8>,
        ctx: &mut TxContext
    ) {
        let dapp_key = MyDappKey {};
        let mut key_tuple = vector::empty();
        key_tuple.push_back(b"user_profile");

        // 更新索引 1 处的字段（年龄）
        dapp_system::set_field(
            dapp_hub,
            dapp_key,
            user_address,
            key_tuple,
            1, // 字段索引
            new_age,
            ctx
        );
    }
}
```

### 示例 3：跨链地址处理

```move
module my_project::cross_chain_example {
    use dubhe::address_system;
    use dubhe::dapp_system;
    use dubhe::dapp_service::DappHub;

    public struct MyDappKey has copy, drop {}

    // 处理来自任何链的用户
    public entry fun register_user(
        dapp_hub: &mut DappHub,
        ctx: &mut TxContext
    ) {
        // 获取原始地址格式（EVM/Solana/Sui）
        let original_address = address_system::ensure_origin(ctx);

        // 检查用户来自哪条链
        let is_evm = address_system::is_evm_address(ctx);
        let is_solana = address_system::is_solana_address(ctx);
        let is_sui = address_system::is_sui_address(ctx);

        // 使用原始地址存储用户注册信息
        let mut key_tuple = vector::empty();
        key_tuple.push_back(b"user_registration");

        let mut value_tuple = vector::empty();
        value_tuple.push_back(original_address.into_bytes());

        dapp_system::set_record(
            dapp_hub,
            MyDappKey {},
            key_tuple,
            value_tuple,
            original_address,
            false,
            ctx
        );
    }

    // 将外部地址转换为 Sui 格式
    public fun convert_evm_user(evm_address: String): address {
        address_system::evm_to_sui(evm_address)
    }

    public fun convert_solana_user(solana_address: String): address {
        address_system::solana_to_sui(solana_address)
    }
}
```

### 示例 4：管理员操作

```move
module my_project::admin_example {
    use dubhe::dapp_system;
    use dubhe::dapp_service::DappHub;
    use std::ascii::string;

    public struct MyDappKey has copy, drop {}

    // 更新 DApp 元数据（仅管理员）
    public entry fun update_metadata(
        dapp_hub: &mut DappHub,
        new_name: String,
        new_description: String,
        new_website: String,
        ctx: &mut TxContext
    ) {
        let dapp_key = dapp_system::dapp_key<MyDappKey>();

        dapp_system::set_metadata(
            dapp_hub,
            dapp_key,
            new_name,
            new_description,
            new_website,
            vector::empty(), // cover_url
            vector::empty(), // partners
            ctx
        );
    }

    // 暂停 DApp（紧急情况）
    public entry fun pause_dapp(
        dapp_hub: &mut DappHub,
        ctx: &mut TxContext
    ) {
        let dapp_key = dapp_system::dapp_key<MyDappKey>();

        dapp_system::set_pausable(
            dapp_hub,
            dapp_key,
            true, // 暂停
            ctx
        );
    }

    // 恢复 DApp
    public entry fun resume_dapp(
        dapp_hub: &mut DappHub,
        ctx: &mut TxContext
    ) {
        let dapp_key = dapp_system::dapp_key<MyDappKey>();

        dapp_system::set_pausable(
            dapp_hub,
            dapp_key,
            false, // 取消暂停
            ctx
        );
    }

    // 转移所有权
    public entry fun transfer_to_dao(
        dapp_hub: &mut DappHub,
        dao_address: address,
        ctx: &mut TxContext
    ) {
        let dapp_key = dapp_system::dapp_key<MyDappKey>();

        dapp_system::transfer_ownership(
            dapp_hub,
            dapp_key,
            dao_address,
            ctx
        );
    }
}
```

### 示例 5：实体 ID 生成

```move
module my_project::entity_example {
    use dubhe::entity_id;
    use std::ascii::string;

    // 从对象生成实体 ID
    public fun create_entity_from_object<T: key>(obj: &T): address {
        entity_id::from_object(obj)
    }

    // 生成确定性实体 ID
    public fun create_user_entity(user_address: address): address {
        entity_id::from_address_with_seed(
            user_address,
            string(b"USER_ENTITY")
        )
    }

    // 从计数器生成实体 ID
    public fun create_numbered_entity(base_id: address, counter: u256): address {
        entity_id::from_address_with_u256(base_id, counter)
    }

    // 从任意数据生成实体
    public fun create_entity_from_data(data: vector<u8>): address {
        entity_id::from_bytes(data)
    }
}
```

---

## 模块依赖关系

### 依赖关系图

```
┌──────────────────────────────────────────────────────────┐
│                     应用层                                │
│              (使用 Dubhe 的你的 DApp)                     │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ 使用
                     ▼
┌──────────────────────────────────────────────────────────┐
│                    系统层                                 │
│  ┌────────────────┐  ┌────────────────┐                 │
│  │  dapp_system   │  │ address_system │                 │
│  │  (业务逻辑)    │  │ (跨链支持)     │                 │
│  └───────┬────────┘  └────────────────┘                 │
│          │                                                │
└──────────┼────────────────────────────────────────────────┘
           │ 使用
           ▼
┌──────────────────────────────────────────────────────────┐
│                     核心层                                │
│  ┌────────────────┐  ┌────────────────┐                 │
│  │  dapp_service  │  │  events        │                 │
│  │  (存储)        │  │  (事件系统)    │                 │
│  └───────┬────────┘  └────────────────┘                 │
│          │                                                │
└──────────┼────────────────────────────────────────────────┘
           │ 使用
           ▼
┌──────────────────────────────────────────────────────────┐
│                   资源层                                  │
│  ┌───────────────┐ ┌──────────────┐ ┌────────────────┐ │
│  │ dapp_metadata │ │dapp_fee_state│ │dapp_fee_config │ │
│  └───────────────┘ └──────────────┘ └────────────────┘ │
│  ┌───────────────┐ ┌──────────────┐                    │
│  │  dapp_key     │ │ dubhe_config │                    │
│  └───────────────┘ └──────────────┘                    │
└──────────────────────────────────────────────────────────┘
           │ 使用
           ▼
┌──────────────────────────────────────────────────────────┐
│                    工具层                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │entity_id │ │   bcs    │ │type_info │ │  math    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 导入关系

**dapp_system 依赖于**：

- `dapp_service` - 存储操作
- `dapp_metadata` - 元数据管理
- `dapp_fee_state` - 费用跟踪
- `dapp_fee_config` - 费用配置
- `type_info` - 类型内省
- `errors` - 错误处理

**dapp_service 依赖于**：

- `dubhe_events` - 事件触发
- `data_key` - 键生成
- Sui 的 `object_table` - 动态存储
- Sui 的 `dynamic_field` - 灵活字段

**address_system 依赖于**：

- Sui 的 `address` - 地址工具
- Sui 的 `hex` - 十六进制编解码

**资源层依赖于**：

- `dapp_service` - 存储访问
- `dapp_key` - 类型标识
- `bcs` - 序列化
- Sui 的 `bcs` - BCS 编码

---

## 最佳实践

### 1. DApp 键设计

**推荐做法**：

```move
// 为每个 DApp 定义唯一的键
public struct MyProjectKey has copy, drop {}
```

**不推荐做法**：

```move
// 不要跨项目重用键
// 不要使用通用名称
public struct DappKey has copy, drop {} // 太通用了
```

### 2. 数据组织

**推荐结构**：

```
账户
├── 表 1（例如 "user_profile"）
│   ├── 字段 0：name
│   ├── 字段 1：age
│   └── 字段 2：email
├── 表 2（例如 "user_inventory"）
│   ├── 字段 0：item_id
│   └── 字段 1：quantity
└── 表 3（例如 "user_stats"）
    ├── 字段 0：level
    └── 字段 1：experience
```

### 3. 错误处理

**使用提供的错误函数**：

```move
use dubhe::errors::{
    no_permission_error,
    insufficient_credit_error,
    invalid_version_error,
};

// 检查条件
no_permission_error(is_admin);
insufficient_credit_error(has_balance);
```

### 4. 费用管理

**监控积分**：

```move
// 在昂贵操作之前检查
let fee_state = dapp_fee_state::get_struct(dapp_hub, dapp_key);
let available = fee_state.free_credit() + fee_state.total_recharged();

// 估算成本
let (bytes, fee) = dapp_system::calculate_bytes_size_and_fee(
    dapp_hub, dapp_key, key, value, count
);
```

### 5. 版本控制

**在关键操作中始终检查版本**：

```move
public entry fun critical_operation(
    dapp_hub: &DappHub,
    version: u32,
    ctx: &mut TxContext
) {
    // 确保使用最新版本
    dapp_system::ensure_latest_version<MyDappKey>(dapp_hub, version);

    // 继续操作
    // ...
}
```

### 6. 多链测试

**使用测试工具进行跨链场景**：

```move
#[test]
fun test_evm_user() {
    use dubhe::address_system;

    let mut scenario = test_scenario::begin(@0x1);

    // 设置 EVM 上下文
    address_system::setup_evm_scenario(
        &mut scenario,
        b"0x9168765EE952de7C6f8fC6FaD5Ec209B960b7622"
    );

    // 使用 EVM 地址进行测试
    // ...
}
```

---

## 高级主题

### 1. 链下存储模式

**何时使用**：

- 数据不需要链上验证
- 降低存储成本
- 高频更新

**工作原理**：

```move
// 设置 offchain = true
dapp_system::set_record(
    dapp_hub,
    dapp_key,
    key,
    value,
    account,
    true, // 链下模式
    ctx
);
```

- 数据不存储在对象中
- 仅触发事件
- 索引器捕获事件存入链下数据库

### 2. 动态字段存储模式

**内部机制**：

```move
// 向账户添加字段
dynamic_field::add(&mut account_data.id, key, value);

// 更新字段
*dynamic_field::borrow_mut(&mut account_data.id, key) = value;

// 读取字段
let value = dynamic_field::borrow(&account_data.id, key);

// 删除字段
dynamic_field::remove(&mut account_data.id, key);
```

**优势**：

- 无需预定义架构
- 动态添加/删除字段
- 使用 Sui 类型系统进行类型安全访问

### 3. 多表设计

**模式**：

```move
// 为不同实体类型使用不同的表
const USER_TABLE: vector<u8> = b"users";
const ITEM_TABLE: vector<u8> = b"items";
const CONFIG_TABLE: vector<u8> = b"config";

// 访问不同的表
let mut key_tuple = vector::empty();
key_tuple.push_back(USER_TABLE);
// ... 或 ITEM_TABLE，或 CONFIG_TABLE
```

### 4. BCS 编码/解码

**自定义类型序列化**：

```move
use sui::bcs;

// 编码
let encoded = bcs::to_bytes(&my_value);

// 解码
let mut bcs_reader = bcs::new(encoded);
let decoded = bcs::peel_u256(&mut bcs_reader);
```

**字符串处理**：

```move
use dubhe::bcs;

// 解析字符串
let name = bcs::peel_string(&mut bcs_reader);

// 解析字符串向量
let tags = bcs::peel_vec_string(&mut bcs_reader);
```

### 5. Genesis 和部署

**Genesis 脚本**：

```move
// 在部署时运行一次
public entry fun run(
    dapp_hub: &mut DappHub,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // 创建框架 DApp
    dapp_system::create_dapp(...);

    // 初始化配置
    deploy_hook::run(dapp_hub, ctx);
}
```

**部署钩子**：

```move
// 设置初始状态
public(package) fun run(
    dapp_hub: &mut DappHub,
    ctx: &mut TxContext
) {
    // 设置费用配置
    dapp_fee_config::set(dapp_hub, free_credit, base_fee, byte_fee, ctx);
}
```

---

## 故障排查

### 常见问题

**1. EInvalidKey 错误**

- **原因**：尝试访问不存在的记录
- **解决方案**：先使用 `has_record()` 检查存在性

**2. Insufficient Credit 错误**

- **原因**：操作余额不足
- **解决方案**：检查费用状态，如有需要充值

**3. No Permission 错误**

- **原因**：非管理员尝试管理员操作
- **解决方案**：确保发送者是已注册的管理员

**4. Not Latest Version 错误**

- **原因**：使用过时的包版本
- **解决方案**：升级到最新版本或更新版本检查

**5. Invalid Package ID 错误**

- **原因**：包 ID 不在允许列表中
- **解决方案**：通过 `upgrade_dapp()` 注册包 ID

---

## 总结

Dubhe 框架为在 Sui 上构建去中心化应用提供了全面的基础：

- **灵活存储**：受 ECS 启发的数据模型，具有动态架构
- **多链支持**：与 EVM 和 Solana 无缝集成
- **费用管理**：用于可持续运营的内置积分系统
- **版本控制**：DApp 演进的安全升级路径
- **权限系统**：细粒度访问控制

### 后续步骤

1. **设置**：部署 DappHub 并初始化你的 DApp
2. **设计**：规划你的数据架构和表结构
3. **实现**：使用系统模块构建业务逻辑
4. **测试**：通过跨链场景进行验证
5. **部署**：使用 genesis 脚本进行生产部署
6. **监控**：跟踪费用和性能指标

### 资源

- **框架源码**：`framework/src/dubhe/`
- **包名称**：`Dubhe`
- **发布地址**：`0x8817b4976b6c607da01cea49d728f71d09274c82e9b163fa20c2382586f8aefc`
- **Sui 框架**：mainnet-v1.46.3

---

**文档版本**：1.0  
**最后更新**：2026 年 2 月  
**维护者**：Obelisk Labs
