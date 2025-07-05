import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateConfigJson, updateMoveTomlAddress, updateGenesisUpgradeFunction } from '../src/utils/utils';
import { DubheConfig } from '@0xobelisk/sui-common';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('generateConfigJson', () => {
  it('should generate correct JSON for string type component', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      components: {
        owned_by: 'address'
      },
      resources: {},
      enums: {},
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    expect(parsed.components).toHaveLength(1);
    expect(parsed.components[0].owned_by).toEqual({
      fields: [
        { entity_id: 'address' },
        { value: 'address' }
      ],
      keys: ['entity_id'],
      offchain: false
    });
  });

  it('should generate correct JSON for empty object component', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      components: {
        player: {}
      },
      resources: {},
      enums: {},
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    expect(parsed.components).toHaveLength(1);
    expect(parsed.components[0].player).toEqual({
      fields: [
        { entity_id: 'address' }
      ],
      keys: ['entity_id'],
      offchain: false
    });
  });

  it('should generate correct JSON for component with fields and keys', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      components: {
        position: {
          offchain: true,
          fields: {
            id: 'address',
            x: 'u64',
            y: 'u64'
          },
          keys: ['id']
        }
      },
      resources: {},
      enums: {},
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    expect(parsed.components).toHaveLength(1);
    expect(parsed.components[0].position).toEqual({
      fields: [
        { id: 'address' },
        { x: 'u64' },
        { y: 'u64' }
      ],
      keys: ['id'],
      offchain: true
    });
  });

  it('should generate correct JSON for string type resource', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      components: {},
      resources: {
        counter: 'u32'
      },
      enums: {},
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    expect(parsed.resources).toHaveLength(1);
    expect(parsed.resources[0].counter).toEqual({
      fields: [
        { value: 'u32' }
      ],
      keys: [],
      offchain: false
    });
  });

  it('should generate correct JSON for string type resource without entity_id', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      components: {},
      resources: {
        counter: 'u32'
      },
      enums: {},
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    expect(parsed.resources).toHaveLength(1);
    expect(parsed.resources[0].counter).toEqual({
      fields: [
        { value: 'u32' }
      ],
      keys: [],
      offchain: false
    });
  });

  it('should generate correct JSON for empty object resource', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      components: {},
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

    expect(parsed.resources).toHaveLength(1);
    expect(parsed.resources[0].counter).toEqual({
      fields: [],
      keys: [],
      offchain: false
    });
  });

  it('should generate correct JSON for resource with fields and keys', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      components: {},
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

    expect(parsed.resources).toHaveLength(1);
    expect(parsed.resources[0].counter).toEqual({
      fields: [
        { id: 'address' },
        { value: 'u32' }
      ],
      keys: ['id'],
      offchain: false
    });
  });

  it('should generate correct JSON for resource with custom fields without entity_id', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      components: {},
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

    expect(parsed.resources).toHaveLength(1);
    expect(parsed.resources[0].counter).toEqual({
      fields: [
        { value: 'u32' },
        { owner: 'address' }
      ],
      keys: ['owner'],
      offchain: false
    });
  });

  it('should handle complex config with multiple components and resources', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      enums: {
        Direction: ["North", "East", "South", "West"],
        MonsterCatchResult: ["Missed", "Caught", "Fled"],
        MonsterType: ["Eagle", "Rat", "Caterpillar"],
        TerrainType: ["None", "TallGrass", "Boulder"]
      },
      components: {
        player: {},
        position: {
          fields: {
            player: 'address',
            x: 'u64',
            y: 'u64'
          },
          keys: ['player']
        },
        owned_by: 'address'
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

    expect(parsed.components).toHaveLength(3);
    expect(parsed.resources).toHaveLength(2);

    // validate components
    expect(parsed.components[0].player).toEqual({
      fields: [{ entity_id: 'address' }],
      keys: ['entity_id'],
      offchain: false
    });

    expect(parsed.components[1].position).toEqual({
      fields: [
        { player: 'address' },
        { x: 'u64' },
        { y: 'u64' }
      ],
      keys: ['player'],
      offchain: false
    });

    expect(parsed.components[2].owned_by).toEqual({
      fields: [
        { entity_id: 'address' },
        { value: 'address' }
      ],
      keys: ['entity_id'],
      offchain: false
    });

    // validate resources
    expect(parsed.resources[0].counter).toEqual({
      fields: [
        { id: 'u256' },
        { player: 'address' },
        { value: 'u32' }
      ],
      keys: ['id', 'player'],
      offchain: false
    });

    expect(parsed.resources[1].balance).toEqual({
      fields: [
        { value: 'u256' }
      ],
      keys: [],
      offchain: false
    });
  });

  it('should handle offchain field correctly when explicitly set to true', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      components: {
        position: {
          offchain: true,
          fields: {
            x: 'u64',
            y: 'u64'
          },
          keys: []
        }
      },
      resources: {},
      enums: {},
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    expect(parsed.components).toHaveLength(1);
    expect(parsed.components[0].position.offchain).toBe(true);
  });

  it('should set offchain to false by default when not specified', () => {
    const config: DubheConfig = {
      name: 'test_project',
      description: 'Test project',
      components: {
        position: {
          fields: {
            x: 'u64',
            y: 'u64'
          },
          keys: []
        }
      },
      resources: {},
      enums: {},
      errors: {}
    };

    const result = generateConfigJson(config);
    const parsed = JSON.parse(result);

    expect(parsed.components).toHaveLength(1);
    expect(parsed.components[0].position.offchain).toBe(false);
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
    const newAddress = "0x1234567890abcdef";
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
    const newAddress = "0xabcdef1234567890";
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
      const newAddress = "0x1234567890abcdef";
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
    const newAddress = "0x1234567890abcdef";
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
      "0x1234567890abcdef",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "0x1",
      "0xabc123def456"
    ];

    testAddresses.forEach(address => {
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
      updateMoveTomlAddress(tempDir, "0x1234567890abcdef");
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
    const newAddress = "";
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
    expect(updatedContent).toContain('    new_table1::register_table(dapp_hub, _ctx);');
    expect(updatedContent).toContain('    new_table2::register_table(dapp_hub, _ctx);');
    expect(updatedContent).toContain('    new_table3::register_table(dapp_hub, _ctx);');
    
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
    expect(updatedContent).toContain('    new_table1::register_table(dapp_hub, _ctx);');
    expect(updatedContent).toContain('    new_table2::register_table(dapp_hub, _ctx);');
    
    // Check that old table registrations are removed
    expect(updatedContent).not.toContain('old_table1::register_table(dapp_hub, _ctx);');
    expect(updatedContent).not.toContain('old_table2::register_table(dapp_hub, _ctx);');
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
    expect(updatedContent).toContain('    new_table1::register_table(dapp_hub, _ctx);');
    expect(updatedContent).toContain('    new_table2::register_table(dapp_hub, _ctx);');
    
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
    expect(updatedContent).toContain('    tableA::register_table(dapp_hub, _ctx);');
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
    expect(updatedContent).toContain('    tableB::register_table(dapp_hub, _ctx);');
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
    expect(updatedContent).toContain('    tableC::register_table(dapp_hub, _ctx);');
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
    expect(updatedContent).toContain('    tableD::register_table(dapp_hub, _ctx);');
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
    expect(updatedContent).toContain('    tableE::register_table(dapp_hub, _ctx);');
    expect(updatedContent).not.toContain('line1');
    expect(updatedContent).not.toContain('line2');
    expect(updatedContent).not.toContain('line3');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
}); 