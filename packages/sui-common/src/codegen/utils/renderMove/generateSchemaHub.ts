import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';

export async function generateSchemaHub(config: DubheConfig, srcPrefix: string) {
  console.log('\n🔑 Starting DappKey Generation...');
  console.log(`  └─ Output path: ${srcPrefix}/src/${config.name}/sources/codegen/schema_hub.move`);

  let code = `module ${config.name}::${config.name}_schema_hub {
    use sui::transfer::public_share_object;
    use sui::dynamic_field as df;

    public struct SchemaHub has key, store {
        id: UID,
        admin: address,
    }
    
    public struct SchemaTypeWapper<phantom Schema: key + store> has copy, store, drop {}

    /// Authorize an schema to access protected features of the SchemaHub.
    public(package) fun authorize_schema<Schema: key + store>(self: &mut SchemaHub) {
        df::add(&mut self.id, SchemaTypeWapper<Schema> {}, true);
    }

    /// Deauthorize an schema by removing its authorization key.
    public(package) fun deauthorize_schema<Schema: key + store>(self: &mut SchemaHub) {
        df::remove<SchemaTypeWapper<Schema>, bool>(&mut self.id, SchemaTypeWapper<Schema> {});
    }

    /// Check if an schema is authorized to access protected features of
    /// the SchemaHub.
    public fun is_schema_authorized<Schema: key + store>(self: &SchemaHub): bool {
        df::exists_(&self.id, SchemaTypeWapper<Schema> {})
    }

    /// Assert that an schema is authorized to access protected features of
    /// the SchemaHub. Aborts with \`EAppNotAuthorized\` if not.
    public fun ensure_schema_authorized<Schema: key + store>(self: &SchemaHub) {
        assert!(self.is_schema_authorized<Schema>(), 0);
    }

    fun init(ctx: &mut TxContext) {
        public_share_object(SchemaHub {
            id: object::new(ctx),
            admin: ctx.sender(),
        });
    }

    #[test_only]
    public fun init_schema_hub_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
`;
  await formatAndWriteMove(
    code,
    `${srcPrefix}/src/${config.name}/sources/codegen/schema_hub.move`,
    'formatAndWriteMove'
  );
  console.log('✅ DappKey Generation Complete\n');
}
