import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateConfigJson,
  updateMoveTomlAddress,
  updateGenesisUpgradeFunction,
  lintSystemGuards,
  formatLintWarnings,
  appendMigrateFunction
} from '../src/utils/utils';
import { DubheConfig } from '@0xobelisk/sui-common';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('generateConfigJson', () => {
  it('should generate correct JSON for string type resource', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      resources: {
        counter: 'u32'
      },
      enums: {},
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    // 1 user resource + 1 auto-injected dapp_fee_state
    expect(parsed.resources).toHaveLength(2);
    // String shorthand injects entity_id: String as implicit key
    expect(parsed.resources[0].counter).toEqual({
      fields: [{ entity_id: 'String' }, { value: 'u32' }],
      keys: ['entity_id'],
      offchain: false
    });
    expect(parsed.resources[1].dapp_fee_state).toBeDefined();
  });

  it('should generate correct JSON for string type resource (entity_id implicit key)', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      resources: {
        counter: 'u32'
      },
      enums: {},
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    // 1 user resource + 1 auto-injected dapp_fee_state
    expect(parsed.resources).toHaveLength(2);
    expect(parsed.resources[0].counter).toEqual({
      fields: [{ entity_id: 'String' }, { value: 'u32' }],
      keys: ['entity_id'],
      offchain: false
    });
  });

  it('should generate correct JSON for empty object resource', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      resources: {
        counter: {
          fields: {},
          keys: []
        }
      },
      enums: {},
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    // 1 user resource + 1 auto-injected dapp_fee_state
    expect(parsed.resources).toHaveLength(2);
    // Empty resource: only the implicit entity_id key is injected
    expect(parsed.resources[0].counter).toEqual({
      fields: [{ entity_id: 'String' }],
      keys: ['entity_id'],
      offchain: false
    });
  });

  it('should generate correct JSON for resource with fields and keys', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      resources: {
        counter: {
          fields: {
            id: 'address',
            value: 'u32'
          },
          keys: ['id']
        }
      },
      enums: {},
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    // 1 user resource + 1 auto-injected dapp_fee_state
    expect(parsed.resources).toHaveLength(2);
    // Explicit keys: entity_id is injected as the first field and first key
    expect(parsed.resources[0].counter).toEqual({
      fields: [{ entity_id: 'String' }, { id: 'address' }, { value: 'u32' }],
      keys: ['entity_id', 'id'],
      offchain: false
    });
  });

  it('should generate correct JSON for resource with custom fields and explicit keys', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      resources: {
        counter: {
          fields: {
            value: 'u32',
            owner: 'address'
          },
          keys: ['owner']
        }
      },
      enums: {},
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    // 1 user resource + 1 auto-injected dapp_fee_state
    expect(parsed.resources).toHaveLength(2);
    // entity_id is prepended as first field and key
    expect(parsed.resources[0].counter).toEqual({
      fields: [{ entity_id: 'String' }, { value: 'u32' }, { owner: 'address' }],
      keys: ['entity_id', 'owner'],
      offchain: false
    });
  });

  it('should always inject dapp_fee_state resource even if not specified', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      resources: {},
      enums: {},
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    expect(parsed.resources).toHaveLength(1);
    expect(parsed.resources[0].dapp_fee_state).toEqual({
      fields: [
        { entity_id: 'String' },
        { base_fee: 'u256' },
        { bytes_fee: 'u256' },
        { free_credit: 'u256' },
        { credit_pool: 'u256' },
        { total_settled: 'u256' },
        { suspended: 'bool' }
      ],
      keys: ['entity_id'],
      offchain: false
    });
  });

  it('should not inject dapp_fee_state if already present in resources', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      resources: {
        dapp_fee_state: {
          fields: {
            entity_id: 'String',
            base_fee: 'u256',
            bytes_fee: 'u256',
            free_credit: 'u256',
            credit_pool: 'u256',
            total_settled: 'u256',
            suspended: 'bool'
          },
          keys: ['entity_id']
        }
      },
      enums: {},
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    // Should NOT add duplicate dapp_fee_state
    const dappFeeStates = parsed.resources.filter((r: any) => 'dapp_fee_state' in r);
    expect(dappFeeStates).toHaveLength(1);
  });

  it('should handle complex config with multiple resources', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      enums: {
        Direction: ['North', 'East', 'South', 'West'],
        MonsterCatchResult: ['Missed', 'Caught', 'Fled'],
        MonsterType: ['Eagle', 'Rat', 'Caterpillar'],
        TerrainType: ['None', 'TallGrass', 'Boulder']
      },
      resources: {
        counter: {
          fields: {
            id: 'u256',
            player: 'address',
            value: 'u32'
          },
          keys: ['id', 'player']
        },
        balance: 'u256'
      },
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    // 2 user resources + 1 auto-injected dapp_fee_state
    expect(parsed.resources).toHaveLength(3);

    // counter: entity_id injected as first field and key
    expect(parsed.resources[0].counter).toEqual({
      fields: [{ entity_id: 'String' }, { id: 'u256' }, { player: 'address' }, { value: 'u32' }],
      keys: ['entity_id', 'id', 'player'],
      offchain: false
    });

    // balance: string shorthand — entity_id: String as implicit key
    expect(parsed.resources[1].balance).toEqual({
      fields: [{ entity_id: 'String' }, { value: 'u256' }],
      keys: ['entity_id'],
      offchain: false
    });

    // auto-injected dapp_fee_state should be last
    expect(parsed.resources[2].dapp_fee_state).toBeDefined();
  });

  it('should handle offchain field correctly when explicitly set to true', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      resources: {
        position: {
          offchain: true,
          fields: {
            x: 'u64',
            y: 'u64'
          },
          keys: []
        }
      },
      enums: {},
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    // 1 user resource + 1 auto-injected dapp_fee_state
    expect(parsed.resources).toHaveLength(2);
    expect(parsed.resources[0].position.offchain).toBe(true);
  });

  it('should set offchain to false by default when not specified', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      resources: {
        position: {
          fields: {
            x: 'u64',
            y: 'u64'
          },
          keys: []
        }
      },
      enums: {},
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    // 1 user resource + 1 auto-injected dapp_fee_state
    expect(parsed.resources).toHaveLength(2);
    expect(parsed.resources[0].position.offchain).toBe(false);
  });
});

describe('updateMoveTomlAddress', () => {
  let tempDir: string;
  let moveTomlPath: string;

  beforeEach(() => {
    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'updateMoveTomlAddress-test-'));
    moveTomlPath = path.join(tempDir, 'Move.toml');
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should update dubhe address in Move.toml file', () => {
    // Create test Move.toml file
    const originalContent = `[package]
name = "dubhe"
version = "1.0.0"
edition = "2024"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "mainnet-v1.46.3" }

[addresses]
sui = "0x2"
dubhe = "0x0"
`;

    fs.writeFileSync(moveTomlPath, originalContent, 'utf-8');

    // Execute update
    const newAddress = '0x1234567890abcdef';
    updateMoveTomlAddress(tempDir, newAddress);

    // Verify file content
    const updatedContent = fs.readFileSync(moveTomlPath, 'utf-8');
    expect(updatedContent).toContain(`dubhe = "${newAddress}"`);
    expect(updatedContent).not.toContain('dubhe = "0x0"');
  });

  it('should update any existing dubhe address', () => {
    // Create test Move.toml file with dubhe address not "0x0"
    const originalContent = `[package]
name = "dubhe"
version = "1.0.0"
edition = "2024"

[addresses]
sui = "0x2"
dubhe = "0x1234567890abcdef"
`;

    fs.writeFileSync(moveTomlPath, originalContent, 'utf-8');

    // Execute update
    const newAddress = '0xabcdef1234567890';
    updateMoveTomlAddress(tempDir, newAddress);

    // Verify file content
    const updatedContent = fs.readFileSync(moveTomlPath, 'utf-8');
    expect(updatedContent).toContain(`dubhe = "${newAddress}"`);
    expect(updatedContent).not.toContain('dubhe = "0x1234567890abcdef"');
  });

  it('should handle different formatting styles', () => {
    // Test different formats: no spaces, multiple spaces, etc.
    const testCases = [
      {
        original: 'dubhe="0x0"',
        expected: 'dubhe = "0x1234567890abcdef"'
      },
      {
        original: 'dubhe = "0x0"',
        expected: 'dubhe = "0x1234567890abcdef"'
      },
      {
        original: 'dubhe  =  "0x0"',
        expected: 'dubhe = "0x1234567890abcdef"'
      }
    ];

    testCases.forEach(({ original, expected }) => {
      // Create test Move.toml file
      const originalContent = `[package]
name = "dubhe"
version = "1.0.0"
edition = "2024"

[addresses]
sui = "0x2"
${original}
`;

      fs.writeFileSync(moveTomlPath, originalContent, 'utf-8');

      // Execute update
      const newAddress = '0x1234567890abcdef';
      updateMoveTomlAddress(tempDir, newAddress);

      // Verify update
      const updatedContent = fs.readFileSync(moveTomlPath, 'utf-8');
      expect(updatedContent).toContain(expected);
    });
  });

  it('should preserve other content in Move.toml file', () => {
    // Create test Move.toml file
    const originalContent = `[package]
name = "dubhe"
version = "1.0.0"
edition = "2024"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "mainnet-v1.46.3" }

[addresses]
sui = "0x2"
dubhe = "0x0"
`;

    fs.writeFileSync(moveTomlPath, originalContent, 'utf-8');

    // Execute update
    const newAddress = '0x1234567890abcdef';
    updateMoveTomlAddress(tempDir, newAddress);

    // Verify other content remains unchanged
    const updatedContent = fs.readFileSync(moveTomlPath, 'utf-8');
    expect(updatedContent).toContain('name = "dubhe"');
    expect(updatedContent).toContain('version = "1.0.0"');
    expect(updatedContent).toContain('edition = "2024"');
    expect(updatedContent).toContain('sui = "0x2"');
  });

  it('should handle different dubhe address formats', () => {
    // Create test Move.toml file
    const originalContent = `[package]
name = "dubhe"
version = "1.0.0"
edition = "2024"

[addresses]
sui = "0x2"
dubhe = "0x0"
`;

    fs.writeFileSync(moveTomlPath, originalContent, 'utf-8');

    // Test different address formats
    const testAddresses = [
      '0x1234567890abcdef',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x1',
      '0xabc123def456'
    ];

    testAddresses.forEach((address) => {
      // Rewrite original content
      fs.writeFileSync(moveTomlPath, originalContent, 'utf-8');

      // Execute update
      updateMoveTomlAddress(tempDir, address);

      // Verify update
      const updatedContent = fs.readFileSync(moveTomlPath, 'utf-8');
      expect(updatedContent).toContain(`dubhe = "${address}"`);
    });
  });

  it('should throw error when Move.toml file does not exist', () => {
    // Don't create Move.toml file
    expect(() => {
      updateMoveTomlAddress(tempDir, '0x1234567890abcdef');
    }).toThrow();
  });

  it('should handle empty address', () => {
    // Create test Move.toml file
    const originalContent = `[package]
name = "dubhe"
version = "1.0.0"
edition = "2024"

[addresses]
sui = "0x2"
dubhe = "0x0"
`;

    fs.writeFileSync(moveTomlPath, originalContent, 'utf-8');

    // Execute update
    const newAddress = '';
    updateMoveTomlAddress(tempDir, newAddress);

    // Verify update
    const updatedContent = fs.readFileSync(moveTomlPath, 'utf-8');
    expect(updatedContent).toContain('dubhe = ""');
  });
});

describe('updateGenesisUpgradeFunction', () => {
  let tempDir: string;
  let genesisPath: string;

  beforeEach(() => {
    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'updateGenesisUpgradeFunction-test-'));
    genesisPath = path.join(tempDir, 'sources', 'codegen');
    fs.mkdirSync(genesisPath, { recursive: true });
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should update upgrade function with new table registrations', () => {
    // Create test genesis.move file
    const originalContent = `#[allow(lint(share_owned))]module dubhe::genesis {

  use sui::clock::Clock;

  use dubhe::dapp_service::{Self, DappHub};

  use dubhe::dapp_key;

  use dubhe::dubhe_asset_id;

  use dubhe::dubhe_config;

  use dubhe::asset_metadata;

  use dubhe::asset_account;

  use dubhe::asset_pools;

  use dubhe::bridge_config;

  use dubhe::bridge_withdraw;

  use dubhe::bridge_deposit;

  use dubhe::wrapper_assets;

  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, _ctx: &mut TxContext) {
    // Create Dapp
    let dapp_key = dapp_key::new();
    dapp_service::create_dapp(dapp_hub, dapp_key, b"dubhe", b"Dubhe Protocol", clock, _ctx);
    // Register tables
    dubhe_asset_id::register_table(dapp_hub, _ctx);
    dubhe_config::register_table(dapp_hub, _ctx);
    asset_metadata::register_table(dapp_hub, _ctx);
    asset_account::register_table(dapp_hub, _ctx);
    asset_pools::register_table(dapp_hub, _ctx);
    bridge_config::register_table(dapp_hub, _ctx);
    bridge_withdraw::register_table(dapp_hub, _ctx);
    bridge_deposit::register_table(dapp_hub, _ctx);
    wrapper_assets::register_table(dapp_hub, _ctx);
    // Logic that needs to be automated once the contract is deployed
    dubhe::deploy_hook::run(dapp_hub, _ctx);
  }

  public(package) fun upgrade(dapp_hub: &mut DappHub, new_package_id: address, new_version: u32, __ctx: &mut TxContext) {
    // Upgrade Dapp
    let dapp_key = dapp_key::new();
    dapp_service::upgrade_dapp(dapp_hub, dapp_key, new_package_id, new_version);
    // Register new tables
    // ==========================================
    // ==========================================
  }
}`;

    fs.writeFileSync(path.join(genesisPath, 'genesis.move'), originalContent, 'utf-8');

    // Execute update
    const tables = ['new_table1', 'new_table2', 'new_table3'];
    updateGenesisUpgradeFunction(tempDir, tables);

    // Verify file content
    const updatedContent = fs.readFileSync(path.join(genesisPath, 'genesis.move'), 'utf-8');

    // Check that the separator comments are preserved
    expect(updatedContent).toContain('// ==========================================');

    // Check that new table registrations are added between separators
    expect(updatedContent).toContain('    new_table1::register_table(dapp_hub, ctx);');
    expect(updatedContent).toContain('    new_table2::register_table(dapp_hub, ctx);');
    expect(updatedContent).toContain('    new_table3::register_table(dapp_hub, ctx);');

    // Check that other parts of the file remain unchanged
    expect(updatedContent).toContain('public entry fun run');
    expect(updatedContent).toContain('dapp_service::create_dapp');
  });

  it('should replace existing table registrations in upgrade function', () => {
    // Create test genesis.move file with existing table registrations
    const originalContent = `#[allow(lint(share_owned))]module dubhe::genesis {

  use sui::clock::Clock;

  use dubhe::dapp_service::{Self, DappHub};

  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, _ctx: &mut TxContext) {
    // Create Dapp
    let dapp_key = dapp_key::new();
    dapp_service::create_dapp(dapp_hub, dapp_key, b"dubhe", b"Dubhe Protocol", clock, _ctx);
  }

  public(package) fun upgrade(dapp_hub: &mut DappHub, new_package_id: address, new_version: u32, __ctx: &mut TxContext) {
    // Upgrade Dapp
    let dapp_key = dapp_key::new();
    dapp_service::upgrade_dapp(dapp_hub, dapp_key, new_package_id, new_version);
    // Register new tables
    // ==========================================
    dubhe::old_table1::register_table(dapp_hub, _ctx);
    dubhe::old_table2::register_table(dapp_hub, _ctx);
    // Some other code
    let some_variable = 123;
    // ==========================================
  }
}`;

    fs.writeFileSync(path.join(genesisPath, 'genesis.move'), originalContent, 'utf-8');

    // Execute update
    const tables = ['new_table1', 'new_table2'];
    updateGenesisUpgradeFunction(tempDir, tables);

    // Verify file content
    const updatedContent = fs.readFileSync(path.join(genesisPath, 'genesis.move'), 'utf-8');

    // Check that new table registrations are added
    expect(updatedContent).toContain('    new_table1::register_table(dapp_hub, ctx);');
    expect(updatedContent).toContain('    new_table2::register_table(dapp_hub, ctx);');

    // Check that old table registrations are removed
    expect(updatedContent).not.toContain('old_table1::register_table(dapp_hub, ctx);');
    expect(updatedContent).not.toContain('old_table2::register_table(dapp_hub, ctx);');
    expect(updatedContent).not.toContain('let some_variable = 123;');

    // Check that separator comments are preserved
    expect(updatedContent).toContain('// ==========================================');
  });

  it('should handle empty tables array', () => {
    // Create test genesis.move file
    const originalContent = `#[allow(lint(share_owned))]module dubhe::genesis {

  use dubhe::dapp_service::{Self, DappHub};

  public(package) fun upgrade(dapp_hub: &mut DappHub, new_package_id: address, new_version: u32, __ctx: &mut TxContext) {
    // Upgrade Dapp
    let dapp_key = dapp_key::new();
    dapp_service::upgrade_dapp(dapp_hub, dapp_key, new_package_id, new_version);
    // Register new tables
    // ==========================================
    old_table::register_table(dapp_hub, _ctx);
    // ==========================================
  }
}`;

    fs.writeFileSync(path.join(genesisPath, 'genesis.move'), originalContent, 'utf-8');

    // Execute update with empty tables array
    const tables: string[] = [];
    updateGenesisUpgradeFunction(tempDir, tables);

    // Verify file content
    const updatedContent = fs.readFileSync(path.join(genesisPath, 'genesis.move'), 'utf-8');

    // Check that separator comments are preserved but no table registrations
    expect(updatedContent).toContain('// ==========================================');
    expect(updatedContent).not.toContain('old_table::register_table(dapp_hub, _ctx);');
  });

  it('should throw error when separator comments are not found', () => {
    // Create test genesis.move file without separator comments
    const originalContent = `#[allow(lint(share_owned))]module dubhe::genesis {

  use dubhe::dapp_service::{Self, DappHub};

  public entry fun run(dapp_hub: &mut DappHub, clock: &Clock, _ctx: &mut TxContext) {
    // Create Dapp
    let dapp_key = dapp_key::new();
    dapp_service::create_dapp(dapp_hub, dapp_key, b"dubhe", b"Dubhe Protocol", clock, _ctx);
  }
}`;

    fs.writeFileSync(path.join(genesisPath, 'genesis.move'), originalContent, 'utf-8');

    // Execute update and expect error
    const tables = ['new_table1'];
    expect(() => {
      updateGenesisUpgradeFunction(tempDir, tables);
    }).toThrow('Could not find separator comments in genesis.move');
  });

  it('should preserve indentation and formatting', () => {
    // Create test genesis.move file with specific formatting
    const originalContent = `#[allow(lint(share_owned))]module dubhe::genesis {

  use dubhe::dapp_service::{Self, DappHub};

  public(package) fun upgrade(
    dapp_hub: &mut DappHub, 
    new_package_id: address, 
    new_version: u32, 
    __ctx: &mut TxContext
  ) {
    // Upgrade Dapp
    let dapp_key = dapp_key::new();
    dapp_service::upgrade_dapp(dapp_hub, dapp_key, new_package_id, new_version);
    // Register new tables
    // ==========================================
    old_table::register_table(dapp_hub, _ctx);
    // ==========================================
  }
}`;

    fs.writeFileSync(path.join(genesisPath, 'genesis.move'), originalContent, 'utf-8');

    // Execute update
    const tables = ['new_table1', 'new_table2'];
    updateGenesisUpgradeFunction(tempDir, tables);

    // Verify file content
    const updatedContent = fs.readFileSync(path.join(genesisPath, 'genesis.move'), 'utf-8');

    // Check that new table registrations are properly indented
    expect(updatedContent).toContain('    new_table1::register_table(dapp_hub, ctx);');
    expect(updatedContent).toContain('    new_table2::register_table(dapp_hub, ctx);');

    // Check that function signature formatting is preserved
    expect(updatedContent).toContain('  public(package) fun upgrade(');
    expect(updatedContent).toContain('    dapp_hub: &mut DappHub,');
  });

  it('should handle empty lines between separators', () => {
    const originalContent = `// ==========================================

// ==========================================`;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'updateGenesisUpgradeFunction-test-'));
    const genesisPath = path.join(tempDir, 'sources', 'codegen');
    fs.mkdirSync(genesisPath, { recursive: true });
    fs.writeFileSync(path.join(genesisPath, 'genesis.move'), originalContent, 'utf-8');
    updateGenesisUpgradeFunction(tempDir, ['tableA']);
    const updatedContent = fs.readFileSync(path.join(genesisPath, 'genesis.move'), 'utf-8');
    expect(updatedContent).toContain('    tableA::register_table(dapp_hub, ctx);');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should handle spaces between separators', () => {
    const originalContent = `// ==========================================
    
// ==========================================`;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'updateGenesisUpgradeFunction-test-'));
    const genesisPath = path.join(tempDir, 'sources', 'codegen');
    fs.mkdirSync(genesisPath, { recursive: true });
    fs.writeFileSync(path.join(genesisPath, 'genesis.move'), originalContent, 'utf-8');
    updateGenesisUpgradeFunction(tempDir, ['tableB']);
    const updatedContent = fs.readFileSync(path.join(genesisPath, 'genesis.move'), 'utf-8');
    expect(updatedContent).toContain('    tableB::register_table(dapp_hub, ctx);');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should handle comments or code between separators', () => {
    const originalContent = `// ==========================================
    // some comment
    let x = 1;
// ==========================================`;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'updateGenesisUpgradeFunction-test-'));
    const genesisPath = path.join(tempDir, 'sources', 'codegen');
    fs.mkdirSync(genesisPath, { recursive: true });
    fs.writeFileSync(path.join(genesisPath, 'genesis.move'), originalContent, 'utf-8');
    updateGenesisUpgradeFunction(tempDir, ['tableC']);
    const updatedContent = fs.readFileSync(path.join(genesisPath, 'genesis.move'), 'utf-8');
    expect(updatedContent).toContain('    tableC::register_table(dapp_hub, ctx);');
    expect(updatedContent).not.toContain('let x = 1;');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should handle nothing between separators', () => {
    const originalContent = `// ==========================================
// ==========================================`;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'updateGenesisUpgradeFunction-test-'));
    const genesisPath = path.join(tempDir, 'sources', 'codegen');
    fs.mkdirSync(genesisPath, { recursive: true });
    fs.writeFileSync(path.join(genesisPath, 'genesis.move'), originalContent, 'utf-8');
    updateGenesisUpgradeFunction(tempDir, ['tableD']);
    const updatedContent = fs.readFileSync(path.join(genesisPath, 'genesis.move'), 'utf-8');
    expect(updatedContent).toContain('    tableD::register_table(dapp_hub, ctx);');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should handle multiple lines between separators', () => {
    const originalContent = `// ==========================================
    // line1
    // line2
    // line3
// ==========================================`;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'updateGenesisUpgradeFunction-test-'));
    const genesisPath = path.join(tempDir, 'sources', 'codegen');
    fs.mkdirSync(genesisPath, { recursive: true });
    fs.writeFileSync(path.join(genesisPath, 'genesis.move'), originalContent, 'utf-8');
    updateGenesisUpgradeFunction(tempDir, ['tableE']);
    const updatedContent = fs.readFileSync(path.join(genesisPath, 'genesis.move'), 'utf-8');
    expect(updatedContent).toContain('    tableE::register_table(dapp_hub, ctx);');
    expect(updatedContent).not.toContain('line1');
    expect(updatedContent).not.toContain('line2');
    expect(updatedContent).not.toContain('line3');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

// ─── Helper: create a temp project with a systems/ directory ──────────────────

function makeTempSystemsDir(files: Record<string, string>): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-guards-test-'));
  const systemsDir = path.join(tmpDir, 'sources', 'systems');
  fs.mkdirSync(systemsDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(systemsDir, name), content, 'utf-8');
  }
  return tmpDir;
}

// ─── lintSystemGuards / formatLintWarnings ───────────────────────────────────

describe('lintSystemGuards', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when function has DappStorage param and ensure_latest_version call', () => {
    tmpDir = makeTempSystemsDir({
      'game.move': `
module game::game_system {
    public entry fun act(
        dapp_storage: &mut dubhe::dapp_service::DappStorage,
        ctx: &mut TxContext
    ) {
        dubhe::dapp_system::ensure_latest_version<game::dapp_key::DappKey>(dapp_storage, 1);
        // do something
    }
}`
    });
    expect(lintSystemGuards(tmpDir)).toEqual([]);
  });

  it('flags function with DappStorage param but missing ensure_latest_version', () => {
    tmpDir = makeTempSystemsDir({
      'counter.move': `
module counter::counter_system {
    public entry fun inc(
        dapp_storage: &mut dubhe::dapp_service::DappStorage,
        ctx: &mut TxContext
    ) {
        // no version guard
    }
}`
    });
    const results = lintSystemGuards(tmpDir);
    expect(results).toHaveLength(1);
    expect(results[0].file).toBe('counter.move');
    expect(results[0].fn).toBe('inc');
  });

  it('does NOT flag a function without DappStorage parameter', () => {
    tmpDir = makeTempSystemsDir({
      'storage.move': `
module game::storage_system {
    use dubhe::dapp_service::UserStorage;
    public entry fun update(user_storage: &mut UserStorage, ctx: &mut TxContext) {
        // no DappStorage, guard not required
    }
}`
    });
    expect(lintSystemGuards(tmpDir)).toEqual([]);
  });

  it('flags only the functions missing the guard when a file has multiple entry functions', () => {
    tmpDir = makeTempSystemsDir({
      'multi.move': `
module game::multi_system {
    public entry fun safe(
        dapp_storage: &mut dubhe::dapp_service::DappStorage,
        ctx: &mut TxContext
    ) {
        dubhe::dapp_system::ensure_latest_version<game::dapp_key::DappKey>(dapp_storage, 1);
    }

    public entry fun unsafe(
        dapp_storage: &mut dubhe::dapp_service::DappStorage,
        ctx: &mut TxContext
    ) {
        // missing guard
    }
}`
    });
    const results = lintSystemGuards(tmpDir);
    expect(results).toHaveLength(1);
    expect(results[0].fn).toBe('unsafe');
  });

  it('returns empty array when systems/ directory does not exist', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-guards-test-nosystems-'));
    expect(lintSystemGuards(tmpDir)).toEqual([]);
  });
});

describe('formatLintWarnings', () => {
  it('returns an empty string for an empty results array', () => {
    expect(formatLintWarnings([])).toBe('');
  });

  it('includes file name and function name in the output', () => {
    const result = formatLintWarnings([
      { file: 'counter.move', fn: 'inc' },
      { file: 'admin.move', fn: 'set_config' }
    ]);
    expect(result).toContain('counter.move');
    expect(result).toContain('inc()');
    expect(result).toContain('admin.move');
    expect(result).toContain('set_config()');
    expect(result).toContain('ensure_latest_version');
  });
});

// ─── appendMigrateFunction ────────────────────────────────────────────────────

describe('appendMigrateFunction', () => {
  let tmpDir: string;
  const PKG = 'counter';

  const BASE_MIGRATE_V1 = `module counter::migrate {
    const ON_CHAIN_VERSION: u32 = 1;

    public fun on_chain_version(): u32 { ON_CHAIN_VERSION }
}`;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'append-migrate-'));
    fs.mkdirSync(path.join(tmpDir, 'sources', 'scripts'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeMigrate(content: string): void {
    fs.writeFileSync(path.join(tmpDir, 'sources', 'scripts', 'migrate.move'), content, 'utf-8');
  }

  function readMigrate(): string {
    return fs.readFileSync(path.join(tmpDir, 'sources', 'scripts', 'migrate.move'), 'utf-8');
  }

  it('bumps ON_CHAIN_VERSION and appends migrate_to_v2 with all required elements', () => {
    writeMigrate(BASE_MIGRATE_V1);
    appendMigrateFunction(tmpDir, PKG, 2);

    const result = readMigrate();
    // Version constant must be bumped to 2
    expect(result).toMatch(/ON_CHAIN_VERSION:\s*u32\s*=\s*2\s*;/);
    expect(result).not.toMatch(/ON_CHAIN_VERSION:\s*u32\s*=\s*1\s*;/);
    // Function must be generated
    expect(result).toContain('migrate_to_v2');
    // new_package_id must be a parameter (cannot derive on-chain due to Sui type_name behavior)
    expect(result).toContain('new_package_id: address');
    expect(result).not.toContain('dapp_key::package_id()');
    expect(result).not.toContain('_new_package_id');
    expect(result).not.toContain('_new_version');
    // upgrade_dapp must be called to register new pkg ID and bump on-chain version
    expect(result).toContain('upgrade_dapp');
    // genesis::migrate extension point must be called
    expect(result).toContain('genesis::migrate');
    // Parameters must reference the correct package
    expect(result).toContain(`${PKG}::migrate::on_chain_version()`);
    expect(result).toContain(`${PKG}::dapp_key::DappKey`);
    expect(result).toContain(`${PKG}::genesis::migrate`);
    // dapp_hub and dapp_storage parameters must be present
    expect(result).toContain('dapp_hub: &mut dubhe::dapp_service::DappHub');
    expect(result).toContain('dapp_storage: &mut dubhe::dapp_service::DappStorage');
  });

  it('is idempotent: second call with the same version leaves the file unchanged', () => {
    writeMigrate(BASE_MIGRATE_V1);
    appendMigrateFunction(tmpDir, PKG, 2);
    const afterFirst = readMigrate();

    appendMigrateFunction(tmpDir, PKG, 2);
    const afterSecond = readMigrate();

    expect(afterSecond).toBe(afterFirst);
    // Exactly one occurrence — no duplication
    const occurrences = (afterSecond.match(/migrate_to_v2/g) ?? []).length;
    expect(occurrences).toBe(1);
  });

  it('throws when migrate.move does not exist', () => {
    // tmpDir has sources/scripts/ dir but no migrate.move file
    expect(() => appendMigrateFunction(tmpDir, PKG, 2)).toThrow('migrate.move not found');
  });

  it('throws when migrate.move has no closing brace', () => {
    writeMigrate('module counter::migrate {\n  const ON_CHAIN_VERSION: u32 = 1;\n');
    expect(() => appendMigrateFunction(tmpDir, PKG, 2)).toThrow('Could not find closing brace');
  });

  it('supports multi-round upgrades: appends migrate_to_v3 after migrate_to_v2 already exists', () => {
    // Simulate a file that already underwent a v1→v2 upgrade
    const v2Content = `module counter::migrate {
    const ON_CHAIN_VERSION: u32 = 2;

    public fun on_chain_version(): u32 { ON_CHAIN_VERSION }

    public entry fun migrate_to_v2(
        dapp_hub: &mut dubhe::dapp_service::DappHub,
        dapp_storage: &mut dubhe::dapp_service::DappStorage,
        new_package_id: address,
        ctx: &mut TxContext
    ) {
        let new_version = counter::migrate::on_chain_version();
        dubhe::dapp_system::upgrade_dapp<counter::dapp_key::DappKey>(
            dapp_storage, new_package_id, new_version, ctx
        );
        counter::genesis::migrate(dapp_hub, dapp_storage, ctx);
    }
}`;
    writeMigrate(v2Content);
    appendMigrateFunction(tmpDir, PKG, 3);

    const result = readMigrate();
    // Both functions must be present
    expect(result).toContain('migrate_to_v2');
    expect(result).toContain('migrate_to_v3');
    // Version must be bumped to 3
    expect(result).toMatch(/ON_CHAIN_VERSION:\s*u32\s*=\s*3\s*;/);
    expect(result).not.toMatch(/ON_CHAIN_VERSION:\s*u32\s*=\s*2\s*;/);
  });
});
