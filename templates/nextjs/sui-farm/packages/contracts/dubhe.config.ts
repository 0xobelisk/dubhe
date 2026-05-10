import { defineConfig } from '@0xobelisk/sui-common';

export const dubheConfig = defineConfig({
  name: 'harvest',
  description: 'Harvest - Full-chain casual farming game with light PvP',

  enums: {
    CropType: ['None', 'Wheat', 'Corn', 'Carrot', 'Pumpkin'],
    PetSpecies: ['None', 'Bunny', 'Chick', 'Fox', 'Deer', 'Dragon'],
    PetRarity: ['Common', 'Uncommon', 'Rare'],
    EggType: ['None', 'Common', 'Rare', 'Seasonal']
  },

  resources: {
    // ── Currency ──────────────────────────────────────────────────────────
    gold: { fields: { amount: 'u64' }, fungible: true },

    // ── Seeds (shop-only input; cannot be listed on player market) ────────
    wheat_seed: { fields: { amount: 'u64' }, fungible: true },
    corn_seed: { fields: { amount: 'u64' }, fungible: true },
    carrot_seed: { fields: { amount: 'u64' }, fungible: true },
    pumpkin_seed: { fields: { amount: 'u64' }, fungible: true },

    // ── Crops (harvested output — fungible + listable on player market) ───
    wheat: { fields: { amount: 'u64' }, fungible: true, listable: true },
    corn: { fields: { amount: 'u64' }, fungible: true, listable: true },
    carrot: { fields: { amount: 'u64' }, fungible: true, listable: true },
    pumpkin: { fields: { amount: 'u64' }, fungible: true, listable: true },

    // ── Farm plots (indexed by plot_id, max 12 per player) ────────────────
    // crop_type: 0=None 1=Wheat 2=Corn 3=Carrot 4=Pumpkin
    farm_plot: {
      fields: {
        plot_id: 'u8',
        crop_type: 'u8',
        count: 'u64',
        planted_at: 'u64',
        harvest_at: 'u64'
      },
      keys: ['plot_id']
    },

    // ── PvP mechanics ─────────────────────────────────────────────────────
    crow_charges: { fields: { count: 'u8', last_refill_at: 'u64' } },
    scarecrow: { fields: { active_until: 'u64' } },
    // crow_damage is set via reactive write by attacker; read on harvest
    crow_damage: { fields: { expires_at: 'u64', damage_pct: 'u8' }, reactive: true },

    // ── Player stats ──────────────────────────────────────────────────────
    profile: { fields: { total_earned: 'u64', plots_owned: 'u8' } },
    season_stats: { fields: { earned_this_season: 'u64' } },

    // ── Eggs (fungible inventory + listable on player market) ─────────────
    common_egg: { fields: { amount: 'u64' }, fungible: true, listable: true },
    rare_egg: { fields: { amount: 'u64' }, fungible: true, listable: true },
    seasonal_egg: { fields: { amount: 'u64' }, fungible: true, listable: true },

    // ── Hatching slot (one egg incubating at a time, not tradeable) ───────
    pet_hatch: {
      fields: {
        egg_type: 'u8', // 1=Common 2=Rare 3=Seasonal
        hatch_at: 'u64' // timestamp when egg can be opened
      }
    },

    // ── Pets (keyed by globally-unique pet_id, listable as NFT) ──────────────
    // pet_id:   ctx.fresh_object_address() — same mechanism as Sui object IDs,
    //           globally unique with no on-chain counter needed
    // species:  1=Bunny 2=Chick 3=Fox 4=Deer 5=Dragon
    // rarity:   0=Common 1=Uncommon 2=Rare
    // satiety:  0-100 — decreases over time
    // happiness: 0-100 — affects active bonus multiplier
    // Note: display slot is NOT stored here — it lives in pet_slot_index only.
    pet: {
      fields: {
        pet_id: 'address',
        species: 'u8',
        rarity: 'u8',
        level: 'u8',
        xp: 'u32',
        happiness: 'u8',
        satiety: 'u8',
        fed_at: 'u64',
        born_at: 'u64'
      },
      keys: ['pet_id'],
      listable: true
    },

    // ── Slot index: maps display slot → pet_id for O(1) slot lookup ──────────
    // Kept in sync with pet records: created on hatch/buy, deleted on dismiss/list.
    pet_slot_index: {
      fields: { slot: 'u8', pet_id: 'address' },
      keys: ['slot']
    },

    // ── Pet slot count (default 1, purchasable up to 3) ───────────────────
    pet_slots: {
      fields: { slots_owned: 'u8' }
    },

    // ── Global configs (singleton, stored in DappStorage) ─────────────────
    season_config: {
      global: true,
      fields: { season_id: 'u8', end_ms: 'u64', bonus_crop: 'u8' }
    },
    shop_config: {
      global: true,
      fields: {
        wheat_seed_price: 'u64',
        corn_seed_price: 'u64',
        carrot_seed_price: 'u64',
        pumpkin_seed_price: 'u64',
        extra_plot_price: 'u64'
      }
    },
    pet_config: {
      global: true,
      fields: {
        common_egg_price: 'u64',
        rare_egg_price: 'u64',
        seasonal_egg_price: 'u64',
        common_hatch_ms: 'u64',
        rare_hatch_ms: 'u64',
        seasonal_hatch_ms: 'u64',
        slot2_price: 'u64',
        slot3_price: 'u64'
      }
    },
    // Stores the ObjectID of the global WorldPermit so the client can look it up
    world_permit_id: {
      global: true,
      fields: { object_id: 'address' }
    },

    // ── Season trophy NFT ─────────────────────────────────────────────────
    // Keyed by season — one trophy per player per season.
    trophy: {
      fields: { season: 'u8', rank: 'u32', total_earned: 'u64' },
      keys: ['season'],
      listable: true
    }
  },

  permits: {
    world: {}
  },

  errors: {
    already_registered: 'Player already registered',
    not_registered: 'Player not registered',
    plot_not_found: 'Farm plot not found',
    plot_already_planted: 'Farm plot already has a crop growing',
    plot_not_ready: 'Crop is not ready to harvest yet',
    plot_is_empty: 'No crop planted on this plot',
    max_plots_reached: 'Maximum farm plots already owned',
    insufficient_gold: 'Not enough gold',
    insufficient_seeds: 'Not enough seeds to plant',
    insufficient_crops: 'Not enough crops',
    crow_no_charges: 'No crow charges remaining',
    crow_target_protected: 'Target farm is protected by a scarecrow',
    invalid_crop_type: 'Invalid crop type',
    season_not_active: 'No active season',
    not_admin: 'Caller is not the DApp admin',
    // Pet errors
    hatch_slot_busy: 'Already incubating an egg',
    no_egg_incubating: 'No egg is currently incubating',
    egg_not_ready: 'Egg is not ready to hatch yet',
    pet_not_found: 'Pet not found in your ranch',
    pet_slot_not_found: 'Pet slot does not exist',
    pet_slot_occupied: 'Pet slot already has a pet',
    pet_slot_empty: 'No pet in that slot',
    max_pet_slots_reached: 'Maximum pet slots already owned',
    insufficient_eggs: 'Not enough eggs of that type',
    invalid_egg_type: 'Invalid egg type',
    invalid_pet_slot: 'Invalid pet slot index'
  }
});
