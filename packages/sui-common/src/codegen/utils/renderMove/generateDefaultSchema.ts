import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import { existsSync } from 'fs';
// import { capitalizeAndRemoveUnderscores } from './generateSchema'; // Unused

export async function generateDefaultSchema(config: DubheConfig, srcPrefix: string) {
  await generateDappSchemaMetadata(config, srcPrefix);
  await generateDappSystem(config, srcPrefix);
}

async function generateDappSchemaMetadata(config: DubheConfig, srcPrefix: string) {
  const path = `${srcPrefix}/src/${config.name}/sources/codegen/core/metadata.move`;
  if (!existsSync(path)) {
    let code = `module ${config.name}::${config.name}_dapp_metadata {
  use std::ascii::String;

  public struct DappMetadata has drop, copy, store {
    name: String,
    description: String,
    cover_url: vector<String>,
    website_url: String,
    created_at: u64,
    partners: vector<String>,
  }

  public fun new(
    name: String,
    description: String,
    cover_url: vector<String>,
    website_url: String,
    created_at: u64,
    partners: vector<String>,
  ): DappMetadata {
    DappMetadata {
            name,
            description,
            cover_url,
            website_url,
            created_at,
            partners,
        }
  }

  public fun set(
    self: &mut DappMetadata,
    name: String,
    description: String,
    cover_url: vector<String>,
    website_url: String,
    created_at: u64,
    partners: vector<String>,
  ) {
    self.name = name;
    self.description = description;
    self.cover_url = cover_url;
    self.website_url = website_url;
    self.created_at = created_at;
    self.partners = partners;
  }

  public fun set_name(self: &mut DappMetadata, name: String) {
    self.name = name;
  }

  public fun set_description(self: &mut DappMetadata, description: String) {
    self.description = description;
  }

  public fun set_cover_url(self: &mut DappMetadata, cover_url: vector<String>) {
    self.cover_url = cover_url;
  }

  public fun set_website_url(self: &mut DappMetadata, website_url: String) {
    self.website_url = website_url;
  }

  public fun set_created_at(self: &mut DappMetadata, created_at: u64) {
    self.created_at = created_at;
  }

  public fun set_partners(self: &mut DappMetadata, partners: vector<String>) {
    self.partners = partners;
  }

  public fun get_name(self: &DappMetadata): String {
    self.name
  }

  public fun get_description(self: &DappMetadata): String {
    self.description
  }

  public fun get_cover_url(self: &DappMetadata): vector<String> {
    self.cover_url
  }

  public fun get_website_url(self: &DappMetadata): String {
    self.website_url
  }

  public fun get_created_at(self: &DappMetadata): u64 {
    self.created_at
  }

  public fun get_partners(self: &DappMetadata): vector<String> {
    self.partners
  }
}
`;
    await formatAndWriteMove(code, path, 'formatAndWriteMove');
  }
}

async function generateDappSystem(config: DubheConfig, srcPrefix: string) {
  const path = `${srcPrefix}/src/${config.name}/sources/codegen/core/system.move`;
  if (!existsSync(path)) {
    let code = `module ${config.name}::${config.name}_dapp_system {
  use std::ascii::String;
  use std::ascii;
  use dubhe::type_info;
  use sui::clock::Clock;
  use sui::transfer::public_share_object;
  use ${config.name}::${config.name}_schema::Schema;
  use ${config.name}::${config.name}_dapp_metadata;
  use ${config.name}::${config.name}_dapp_metadata::DappMetadata;
  use dubhe::storage::add_field;
  use dubhe::storage_value;
  use dubhe::storage_value::StorageValue;

  public entry fun set_metadata(
    schema: &mut Schema,
    name: String,
    description: String,
    cover_url: vector<String>,
    website_url: String,
    partners: vector<String>,
    ctx: &TxContext,
  ) {
    let admin = schema.dapp__admin().try_get();
    assert!(admin == option::some(ctx.sender()), 0);
    let created_at = schema.dapp__metadata().get().get_created_at();
    schema.dapp__metadata().set(
            ${config.name}_dapp_metadata::new(
                name,
                description,
                cover_url,
                website_url,
                created_at,
                partners
            )
        );
    }


    public entry fun transfer_ownership(schema: &mut Schema, new_admin: address, ctx: &mut TxContext) {
    let admin = schema.dapp__admin().try_get();
    assert!(admin == option::some(ctx.sender()), 0);
    schema.dapp__admin().set(new_admin);
    }

    public entry fun set_safe_mode(schema: &mut Schema, safe_mode: bool, ctx: &TxContext) {
    let admin = schema.dapp__admin().try_get();
    assert!(admin == option::some(ctx.sender()), 0);
    schema.dapp__safe_mode().set(safe_mode);
    }

    public fun ensure_no_safe_mode(schema: &mut Schema) {
    assert!(!schema.dapp__safe_mode()[], 0);
    }

    public fun ensure_has_authority(schema: &mut Schema, ctx: &TxContext) {
    assert!(schema.dapp__admin().get() == ctx.sender(), 0);
    }

    public fun ensure_has_schema<S: key + store>(schema: &mut Schema, new_schema: &S) {
    let schema_id = object::id_address(new_schema);
    assert!(schema.dapp__authorised_schemas().get().contains(&schema_id), 0);
    }

    public(package) fun create(schema: &mut Schema, name: String, description: String, clock: &Clock, ctx: &mut TxContext){
    add_field<StorageValue<address>>(schema.id(), b"dapp__admin", storage_value::new(b"dapp__admin", ctx));
    add_field<StorageValue<address>>(schema.id(), b"dapp__package_id", storage_value::new(b"dapp__package_id", ctx));
    add_field<StorageValue<u32>>(schema.id(), b"dapp__version", storage_value::new(b"dapp__version", ctx));
    add_field<StorageValue<DappMetadata>>(schema.id(), b"dapp__metadata", storage_value::new(b"dapp__metadata", ctx));
    add_field<StorageValue<bool>>(schema.id(), b"dapp__safe_mode", storage_value::new(b"dapp__safe_mode", ctx));
    add_field<StorageValue<vector<address>>>(schema.id(), b"dapp__authorised_schemas", storage_value::new(b"dapp__authorised_schemas", ctx));
    schema.dapp__metadata().set(
            ${config.name}_dapp_metadata::new(
                name,
                description,
                vector[],
                ascii::string(b""),
                clock.timestamp_ms(),
                vector[]
            )
        );
    let package_id = type_info::current_package_id<Schema>();
    schema.dapp__package_id().set(package_id);
    schema.dapp__admin().set(ctx.sender());
    schema.dapp__version().set(1);
    schema.dapp__safe_mode().set(false);
    schema.dapp__authorised_schemas().set(vector[]);
    }

    public(package) fun add_schema<S: key + store>(schema: &mut Schema, new_schema: S) {
    let mut schemas = schema.dapp__authorised_schemas()[];
    schemas.push_back(object::id_address<S>(&new_schema));
    schema.dapp__authorised_schemas().set(schemas);
    public_share_object(new_schema);
    }
}

`;
    await formatAndWriteMove(code, path, 'formatAndWriteMove');
  }
}
