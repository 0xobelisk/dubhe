import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';

/**
 * Generates a `user_storage_init.move` module that provides a single entry-point
 * for end-users to create their `UserStorage` object for the DApp.
 *
 * Only generated for non-dubhe packages; the dubhe framework manages its own
 * internal UserStorage creation through dapp_system::create_user_storage.
 */
export async function generateUserStorageInit(config: DubheConfig, path: string) {
  if (config.name === 'dubhe') return;

  const code = `module ${config.name}::user_storage_init {
  use dubhe::dapp_service::{DappHub, DappStorage};
  use dubhe::dapp_system;
  use ${config.name}::dapp_key::DappKey;

  /// Create a UserStorage for the transaction sender within this DApp.
  /// Must be called once before the user can interact with any user-level resources.
  /// Aborts if the DApp is currently suspended or the framework version has advanced.
  #[allow(lint(public_entry))]
  public entry fun init_user_storage(
      dapp_hub: &DappHub,
      dapp_storage: &mut DappStorage,
      ctx: &mut TxContext,
  ) {
      dapp_system::create_user_storage<DappKey>(dapp_hub, dapp_storage, ctx);
  }
}
`;
  await formatAndWriteMove(code, path, 'formatAndWriteMove');
}
