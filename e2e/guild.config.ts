import { defineConfig } from '@0xobelisk/sui-common';

/**
 * Guild-game DApp config.
 *
 * Exercises ALL new codegen annotations and config sections:
 *   resources:  fungible, unique, reactive, transferable, listable
 *   objects:    GuildStorage — accepts gold + weapon; acceptsFrom dungeon_run (gold)
 *   scenes:     PvpMatchStorage — accepts loot
 *               DungeonRunStorage — accepts gold; acceptsFrom pvp_match (loot)
 */
export const guildConfig = defineConfig({
  name: 'guild',
  description: 'Guild game — codegen annotation regression',

  resources: {
    // ── fungible ────────────────────────────────────────────────────────
    gold: {
      fields: { amount: 'u64' },
      fungible: true,
      transferable: true
    },
    loot: {
      fields: { amount: 'u64' },
      fungible: true,
      transferable: true
    },

    // ── unique (non-fungible, multi-holdable) ────────────────────────────
    weapon: {
      fields: { item_id: 'u64', damage: 'u32', rarity: 'u8' },
      unique: true,
      keys: ['item_id'],
      transferable: true,
      listable: true
    },

    // ── reactive (cross-user scene writes) ───────────────────────────────
    hp: {
      fields: { current: 'u64', max: 'u64' },
      reactive: true
    },

    // ── keyed reactive ────────────────────────────────────────────────────
    buff: {
      fields: { player: 'address', value: 'u32' },
      keys: ['player'],
      reactive: true
    }
  },

  objects: {
    guild: {
      fields: { level: 'u32', name: 'String' },
      accepts: ['gold', 'weapon'],
      // After a dungeon run, players can transfer accumulated gold into the guild vault.
      acceptsFrom: ['dungeon_run']
    }
  },

  scenes: {
    pvp_match: {
      fields: { round: 'u32', map_id: 'u64' },
      accepts: ['loot']
    },
    // Cooperative dungeon run scene: holds gold and loot earned during the run.
    // When the run ends, gold can be bulk-transferred to the guild vault.
    // Loot can be transferred in from a pvp_match (rare cross-scene flow).
    dungeon_run: {
      fields: { floor: 'u32', boss_id: 'u64' },
      accepts: ['gold', 'loot'],
      acceptsFrom: ['pvp_match']
    }
  },

  errors: {
    not_guild_member: 'Caller is not a guild member',
    match_already_ended: 'Match has already ended'
  }
});
