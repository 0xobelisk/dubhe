import { defineConfig } from '@0xobelisk/sui-common';

export const dubheConfig = defineConfig({
  name: 'card_duel',
  description: 'Card Duel - Full-chain PvP card battle game (1v1 duels + multiplayer brawls)',

  enums: {
    // Documentation enums — stored on-chain as u8 (see constants in card_system.move)
    CardKind: ['None', 'Strike', 'Fireball', 'Heal', 'Shield'],
    Rarity: ['Common', 'Rare', 'Epic'],
    MatchState: ['Waiting', 'Active', 'Finished']
  },

  resources: {
    // ── Currency (wager + shop). Transferable into duel/brawl scenes and arena. ──
    gold: { fields: { amount: 'u64' }, fungible: true, transferable: true, listable: true },

    // ── Card NFT, keyed by globally-unique card_id (ctx.fresh_object_address()) ──
    // kind:   1=Strike 2=Fireball 3=Heal 4=Shield
    // rarity: 0=Common 1=Rare 2=Epic
    card: {
      fields: { card_id: 'address', kind: 'u8', power: 'u32', rarity: 'u8' },
      keys: ['card_id'],
      listable: true
    },

    // ── Battle deck: exactly 5 owned cards selected for matches ─────────────
    deck: { fields: { card_ids: 'vector<address>' } },

    // ── Per-match combat state. Written cross-user by the opponent through a
    //    ScenePermit (reactive). match_id = scene address, @0x0 when idle. ──
    battle_state: {
      fields: { match_id: 'address', hp: 'u64', shield: 'u64' },
      reactive: true
    },

    // ── Ladder profile. Reactive so match settlement can record the loss
    //    on the defeated player's storage. ──
    profile: {
      fields: { wins: 'u32', losses: 'u32', rating: 'u32' },
      reactive: true
    },

    // ── Global game configuration (singleton in DappStorage) ────────────────
    game_config: {
      global: true,
      fields: {
        pack_price: 'u64',
        starting_gold: 'u64',
        rake_bps: 'u64',
        max_hp: 'u64',
        turn_timeout_ms: 'u64'
      }
    }
  },

  objects: {
    // ── Arena treasury: collects the rake from every settled match.
    //    adminOnly — only the DApp admin can create it (done in deploy_hook). ──
    arena: {
      fields: { name: 'String', season: 'u8' },
      accepts: ['gold'],
      acceptsFrom: ['duel', 'brawl'],
      adminOnly: true
    }
  },

  permits: {
    // 1v1 direct-invite permit: challenger creates with_invitations([opponent])
    duel_permit: {},
    // Open-invite permit: anyone can join until the room is full
    brawl_permit: {}
  },

  scenes: {
    // ── 1v1 duel: stake escrow + turn-based combat ──────────────────────────
    // state: 0=Waiting(invite pending) 1=Active 2=Finished
    duel: {
      fields: {
        challenger: 'address',
        opponent: 'address',
        stake: 'u64',
        state: 'u8',
        turn_addr: 'address',
        round: 'u32',
        winner: 'address',
        used_cards_a: 'vector<address>',
        used_cards_b: 'vector<address>',
        last_action_ms: 'u64'
      },
      authorization: { kind: 'permit', permit: 'duel_permit' },
      accepts: ['gold']
    },

    // ── Multiplayer brawl: open room, entry fee pot, last player standing ───
    // state: 0=Open(joinable) 1=Active 2=Finished
    brawl: {
      fields: {
        host: 'address',
        entry_fee: 'u64',
        max_players: 'u64',
        state: 'u8',
        round: 'u32',
        turn_index: 'u64',
        players: 'vector<address>',
        alive: 'vector<address>',
        winner: 'address',
        last_action_ms: 'u64'
      },
      authorization: { kind: 'permit', permit: 'brawl_permit' },
      accepts: ['gold']
    }
  },

  errors: {
    already_registered: 'Player already registered',
    not_registered: 'Player not registered',
    insufficient_gold: 'Not enough gold',
    // Cards & deck
    card_not_found: 'Card not owned',
    invalid_card_kind: 'Invalid card kind',
    deck_wrong_size: 'Battle deck must contain exactly 5 cards',
    deck_duplicate_card: 'Battle deck contains duplicate cards',
    card_not_in_deck: 'Card is not in your battle deck',
    card_already_used: 'Card already used in this match',
    // Match lifecycle
    already_in_match: 'Already in an active match',
    not_in_match: 'Not in an active match',
    wrong_match: 'Storage does not belong to this match',
    match_not_waiting: 'Match is not waiting for an opponent',
    match_not_active: 'Match is not active',
    match_not_finished: 'Match is not finished',
    not_match_winner: 'Caller is not the winner of this match',
    not_your_turn: 'Not your turn',
    not_invited: 'Caller is not the invited opponent',
    not_challenger: 'Only the challenger can do this',
    cannot_play_self: 'Cannot start a match against yourself',
    invalid_stake: 'Stake must be greater than zero',
    turn_not_timed_out: 'Current turn has not timed out yet',
    target_not_alive: 'Target is not alive in this brawl',
    // Brawl rooms
    brawl_not_host: 'Only the room host can do this',
    brawl_full: 'Brawl room is full',
    brawl_too_few_players: 'Need at least 2 players to start',
    brawl_invalid_max_players: 'Max players must be between 2 and 8',
    already_joined: 'Already joined this brawl',
    not_in_brawl: 'Caller has not joined this brawl',
    host_cannot_leave: 'The host must cancel the room instead of leaving'
  }
});
