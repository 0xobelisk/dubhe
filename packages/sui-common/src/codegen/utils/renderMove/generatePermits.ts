import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import path from 'node:path';

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map((word) => {
      if (/^\d+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

export async function generatePermits(config: DubheConfig, outputDir: string) {
  if (!config.permits || Object.keys(config.permits).length === 0) return;
  console.log('\n📦 Starting Scene Permit Generation...');

  const projectName = config.name;

  for (const permitKey of Object.keys(config.permits)) {
    console.log(`     └─ ${permitKey}`);
    const markerName = toPascalCase(permitKey);
    const permitTypeTag = `b"${permitKey}"`;
    const fullPermitType = `dubhe::dapp_service::ScenePermit<${markerName}>`;

    const code = `module ${projectName}::${permitKey} {
    use dubhe::dapp_service::{Self, DappStorage};
    use ${projectName}::dapp_key;
    use ${projectName}::dapp_key::DappKey;

    const PERMIT_TYPE: vector<u8> = ${permitTypeTag};

    #[error]
    const EPermitNotExpiredYet: vector<u8> = b"Scene permit is still active";

    /// Phantom type that distinguishes this permit from others at compile time.
    public struct ${markerName} has copy, drop {}

    public fun meta(permit: &${fullPermitType}): &dubhe::dapp_service::PermitMetadata {
        dapp_service::scene_permit_meta(permit)
    }

    public fun is_active(permit: &${fullPermitType}, now_ms: u64): bool {
        dapp_service::is_scene_active(dapp_service::scene_permit_meta(permit), now_ms)
    }

    public fun is_participant(permit: &${fullPermitType}, addr: address): bool {
        dubhe::dapp_system::is_scene_permit_participant<${markerName}>(permit, addr)
    }

    public(package) fun new_${permitKey}(
        dapp_storage:     &DappStorage,
        participants:     vector<address>,
        expires_at:       std::option::Option<u64>,
        max_participants: std::option::Option<u64>,
        ctx:              &mut TxContext,
    ): ${fullPermitType} {
        dubhe::dapp_system::new_scene_permit<DappKey, ${markerName}>(
            dapp_key::new(), dapp_storage, PERMIT_TYPE, participants, expires_at, max_participants, ctx
        )
    }

    public(package) fun new_${permitKey}_with_invitations(
        dapp_storage:      &DappStorage,
        invitees:          vector<address>,
        invites_expire_at: std::option::Option<u64>,
        scene_expires_at:  std::option::Option<u64>,
        max_participants:  std::option::Option<u64>,
        ctx:               &mut TxContext,
    ): ${fullPermitType} {
        dubhe::dapp_system::new_scene_permit_with_invitations<DappKey, ${markerName}>(
            dapp_key::new(), dapp_storage, PERMIT_TYPE, invitees, invites_expire_at, scene_expires_at, max_participants, ctx
        )
    }

    public(package) fun share_${permitKey}(permit: ${fullPermitType}) {
        dubhe::dapp_system::share_scene_permit<DappKey, ${markerName}>(
            dapp_key::new(), permit
        );
    }

    public(package) fun create_${permitKey}(
        dapp_storage:     &DappStorage,
        participants:     vector<address>,
        expires_at:       std::option::Option<u64>,
        max_participants: std::option::Option<u64>,
        ctx:              &mut TxContext,
    ) {
        dubhe::dapp_system::create_and_share_scene_permit<DappKey, ${markerName}>(
            dapp_key::new(), dapp_storage, PERMIT_TYPE, participants, expires_at, max_participants, ctx
        );
    }

    public(package) fun create_${permitKey}_with_invitations(
        dapp_storage:      &DappStorage,
        invitees:          vector<address>,
        invites_expire_at: std::option::Option<u64>,
        scene_expires_at:  std::option::Option<u64>,
        max_participants:  std::option::Option<u64>,
        ctx:               &mut TxContext,
    ) {
        dubhe::dapp_system::create_and_share_scene_permit_with_invitations<DappKey, ${markerName}>(
            dapp_key::new(), dapp_storage, PERMIT_TYPE, invitees, invites_expire_at, scene_expires_at, max_participants, ctx
        );
    }

    public(package) fun accept_${permitKey}(
        permit:       &mut ${fullPermitType},
        user_storage: &dubhe::dapp_service::UserStorage,
        ctx:          &TxContext,
    ) {
        dubhe::dapp_system::accept_scene_permit_invitation<DappKey, ${markerName}>(
            dapp_key::new(), permit, user_storage, ctx
        );
    }

    public(package) fun join_${permitKey}(
        permit:       &mut ${fullPermitType},
        user_storage: &dubhe::dapp_service::UserStorage,
        ctx:          &TxContext,
    ) {
        dubhe::dapp_system::join_scene_permit<DappKey, ${markerName}>(dapp_key::new(), permit, user_storage, ctx);
    }

    public(package) fun leave_${permitKey}(
        permit:       &mut ${fullPermitType},
        user_storage: &dubhe::dapp_service::UserStorage,
        ctx:          &TxContext,
    ) {
        dubhe::dapp_system::leave_scene_permit<DappKey, ${markerName}>(dapp_key::new(), permit, user_storage, ctx);
    }

    public(package) fun expire_${permitKey}(
        permit: ${fullPermitType},
        ctx:    &TxContext,
    ) {
        assert!(
            !dapp_service::is_scene_active(dapp_service::scene_permit_meta(&permit), ctx.epoch_timestamp_ms()),
            EPermitNotExpiredYet
        );
        dubhe::dapp_system::destroy_scene_permit<DappKey, ${markerName}>(
            dapp_key::new(), permit
        );
    }
}
`;

    await formatAndWriteMove(code, path.join(outputDir, `${permitKey}.move`), 'formatAndWriteMove');
  }
}
