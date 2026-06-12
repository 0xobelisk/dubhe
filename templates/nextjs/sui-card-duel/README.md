# Card Duel — full-chain PvP card battles on Sui

Card Duel is a Dubhe template that demonstrates every storage tier and
authorization primitive of the framework in one playable game: 1v1 duels
with gold stakes, multiplayer brawl rooms, a card marketplace, and an
on-chain arena treasury that collects a rake from every match. All match
actions are signed silently by a session key while every on-chain identity
resolves to the player's main wallet.

## Gameplay

The game is a turn-based card battler with a closed gold economy.

### Onboarding

Connect a wallet, create your UserStorage, and register. Registration grants
500 gold and a 5-card starter deck (3× Strike, 1× Fireball, 1× Shield).
Activate a session key from the banner to play without wallet popups.

### Cards and decks

Every card has a kind and a rarity. Kinds decide what the card does; rarity
multiplies its power.

| Kind     | Effect               | Base power | Pack odds |
| -------- | -------------------- | ---------- | --------- |
| Strike   | damage to a target   | 12         | 40%       |
| Fireball | damage to a target   | 18         | 25%       |
| Heal     | restore your HP      | 10         | 20%       |
| Shield   | absorb future damage | 8          | 15%       |

| Rarity | Pack odds | Power bonus |
| ------ | --------- | ----------- |
| Common | 70%       | —           |
| Rare   | 25%       | +1/3        |
| Epic   | 5%        | +3/4        |

Card packs cost 100 gold and mint one random card using `sui::random`.
Your battle deck is exactly 5 distinct cards you own; editing the deck is
free (ownership is verified on-chain).

### Duel (1v1, direct invitation)

Challenge a specific address with a gold stake. Your stake is escrowed into
the match scene immediately; the opponent's stake joins the pot when they
accept. Players alternate turns at 30 HP each, and every card can be played
once per duel. Knock the opponent to 0 HP, then collect the pot minus the
3% arena rake. Surrender concedes the pot; a player who stalls past the
5-minute turn timeout can be claimed against. The challenger can cancel a
pending invite for a full refund.

### Brawl (1vN, open room)

Open a room with an entry fee and a player cap (2–8). Anyone can join until
the room is full; joining escrows the fee, and leaving an open room refunds
it. Once at least two players are in, the host starts the match. Turns
rotate through the alive list; attack cards require picking a target, and
cards are reusable between turns. Eliminated players drop out of rotation,
stalling players can be kicked on timeout, and the last player standing
collects the whole pot (minus rake).

### Market, leaderboard, and admin

- **Market** — list cards (NFT-style records) or gold (fungible amounts)
  for SUI. Purchases settle through the framework marketplace with
  automatic fee splitting. Trades require the main wallet.
- **Leaderboard** — ladder rating (1200 start, ±25 per match) read from the
  indexer.
- **Admin** — the deployer wallet configures the arena display data and the
  game config (pack price, starting gold, rake, HP, turn timeout), and
  withdraws the accumulated rake from the arena treasury into its own gold
  balance.

The economy loop: win matches to earn gold, spend gold on packs to chase
Rare/Epic cards, build a stronger deck, and sell surplus cards for SUI.

## Dubhe feature coverage

Use this template as a reference when you need a working example of a
specific framework capability.

| Capability                          | Where it is demonstrated                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| UserStorage resources               | `gold`, `profile`, `deck`, `battle_state`, `card` (per-player state)                      |
| Global resources                    | `game_config` (singleton, set by `deploy_hook` / `arena_system::set_game_config`)         |
| ObjectStorage (named shared object) | `arena` treasury — created by `deploy_hook` (entity id `"main"`), admin-only field writes |
| SceneStorage (multi-user object)    | `duel` and `brawl` matches (escrowed pot + turn state)                                    |
| ScenePermit: direct invitations     | `duel_system::create_duel` — only the invited opponent can accept                         |
| ScenePermit: open invitations       | `brawl_system::create_brawl` — anyone joins until the room is full                        |
| Reactive writes (cross-user)        | combat damage and loss records written to the opponent's UserStorage                      |
| Transferable resources              | gold moves User ⇄ Scene (stake escrow), Scene → Object (rake), Object → User (withdraw)   |
| Listable resources / marketplace    | `market_system` — card NFTs and fungible gold listed for SUI                              |
| Session keys + canonical owner      | every match action is session-signed; on-chain identity resolves to the main wallet       |
| Randomness                          | `card_system::open_pack` uses `sui::random::Random`                                       |
| Indexer system tables               | `dubheSceneStorages`, `dubheObjectStorages`, `dubheSessions`, marketplace tables          |
| Deploy hook                         | `deploy_hook` initialises the game config and creates the shared arena at publish time    |

## Session keys and identity

Match actions (create, accept, attack, defend, finish, leave) are signed by
an ephemeral session key once you activate one from the header — no wallet
popup per move. The contracts never use the transaction sender as the player
identity: every system resolves the player through
`dapp_service::canonical_owner(user_storage)`, so permit participants, scene
fields, profiles, and gold are always recorded under the main wallet address
even when a session key signs. Revoking the session
(`dapp_system::deactivate_session`) immediately removes its write access.

On the client, session state is scoped per (network, main wallet address):
each account keeps its own ephemeral keypair, switching accounts never shows
another account's session, and the local state is revalidated against the
indexer's `dubheSessions` table so sessions revoked elsewhere disappear
automatically.

Onboarding (UserStorage creation, registration, session activation) and
marketplace trades still require the main wallet because they move SUI or
establish the delegation itself.

## Verified behaviour

The template ships with two layers of tests, both runnable against this
repository.

### Move unit tests (29 cases, `pnpm test`)

- **Duel lifecycle** — full flow from registration to knockout, settlement
  (pot minus rake), profile/rating updates, and scene cleanup; cancel with
  refund; surrender; timeout claims (success and "too early" failure).
- **Session delegation** — a session key plays a full duel for its canonical
  owner; an unauthorized signer is rejected.
- **Guard rails** — self-challenge, zero stake, insufficient gold, uninvited
  accept, out-of-turn attack, card reuse within a duel, attack card played
  as defense, double-matching, loser attempting settlement, wrong deck size,
  duplicate deck cards, double registration.
- **Brawl lifecycle** — three-player flow with eliminations and pot
  collection; entry-fee refunds on leave; full-room join rejection; host
  leave/start restrictions; out-of-turn attacks; surrender deciding a match;
  timeout kicks.

### End-to-end scripts (against a running localnet stack)

| Script                   | What it verifies                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| `scripts/e2e-duel.ts`    | duel flow + indexer state (gold, profiles, scene destruction)                                     |
| `scripts/e2e-brawl.ts`   | brawl flow + `open_pack` randomness + balance assertions                                          |
| `scripts/e2e-session.ts` | session key plays a full duel; identity resolves to the main wallet; revoked sessions lose access |
| `scripts/e2e-lobby.ts`   | the client's scene-discovery queries (dappKey-filtered) against live GraphQL                      |
| `scripts/e2e-market.ts`  | card/gold listing, purchase, and listing closure                                                  |

`open_pack` and the market system are covered by the e2e layer rather than
unit tests because they depend on `sui::random` and marketplace settlement.

## Requirements

- Node.js 18.20+ and pnpm 9+
- [Sui CLI](https://docs.sui.io/build/install)
- Docker (for the indexer's PostgreSQL + GraphQL server)

## Quick start

Run everything (localnet node, contract deployment, indexer, GraphQL server,
and the Next.js client) with one command from the template root:

```bash
pnpm install
pnpm dev
```

`pnpm dev` opens an mprocs dashboard with five processes: `node` (localnet),
`contracts` (deploy + indexer), `graphql` (Docker), `client` (Next.js on
http://localhost:3000), and an interactive `shell`. Wait until the client
process reports "Ready", then open the app and connect a Sui wallet that is
set to localnet.

To seed a custom game configuration after deployment:

```bash
cd packages/contracts
pnpm seed:localnet
```

## Project structure

```
packages/
  contracts/
    dubhe.config.ts          # resources, objects, scenes, permits, errors
    src/card_duel/
      sources/systems/       # player / card / duel / brawl / arena / market
      sources/scripts/       # deploy_hook (game config + arena creation)
      sources/tests/         # Move unit tests (pnpm test)
    scripts/                 # seed, revenue, and e2e verification scripts
  client/
    src/app/                 # lobby, collection, duel/[id], brawl/[id],
                             # market, leaderboard, admin
    src/app/lib/             # bcs decoders, scene discovery, game constants
    src/app/hooks/           # useGame (state + tx), useSessionKey
```

## Useful commands

Run these from `packages/contracts` unless noted otherwise.

| Command                                  | Purpose                                                              |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `pnpm test`                              | Move unit tests (29 cases)                                           |
| `pnpm tsx scripts/e2e-duel.ts`           | Scripted 1v1 duel against a running localnet stack                   |
| `pnpm tsx scripts/e2e-brawl.ts`          | Scripted brawl + pack opening                                        |
| `pnpm tsx scripts/e2e-session.ts`        | Full duel played by a session key; verifies canonical-owner identity |
| `pnpm tsx scripts/e2e-market.ts`         | Scripted card/gold listing and purchase                              |
| `pnpm tsx scripts/e2e-lobby.ts`          | Verifies the client's indexer queries; seeds lobby data              |
| `pnpm seed:localnet`                     | Re-apply the default game configuration                              |
| `pnpm tsx scripts/query-dapp-revenue.ts` | Inspect DApp fee revenue                                             |
