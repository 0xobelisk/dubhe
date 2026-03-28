# zkLogin Helper

Interactive CLI for executing Sui transactions with zkLogin via EVE Frontier OAuth.

## Network support

**This flow works out of the box only on devnet.** The bundled prover (`PROVER_URL`) and fixed salt are intended for devnet.

For **testnet** or **mainnet**, you must use [Enoki](https://portal.enoki.mystenlabs.com/) (or another compatible service) to obtain:

- User **salt**
- **ZK proof** (and related inputs)

Configure the script with your Enoki API keys and endpoints so it fetches salt and proof from Enoki instead of the dev-only prover.

## Usage

Requires **Node.js >=22** and `pnpm` installed globally.

```bash copy
pnpm install
pnpm zklogin
```

## Flow

1. Script generates ephemeral credentials and displays a login URL
2. Open the URL in your browser and log in
3. Copy the `id_token` from the redirect URL (`https://sui.io/#id_token=eyJ...`)
4. Paste the JWT when prompted
5. Optionally provide transaction bytes, or press Enter for a test transaction

## Config

Edit `zkLoginTransaction.ts` to change:

- `AUTH_URL` / `CLIENT_ID` - OAuth provider settings
- `SUI_NETWORK_URL` - Target Sui network (default: devnet)
- `PROVER_URL` - ZK prover endpoint (devnet-only by default; use Enoki for testnet/mainnet)
- `USER_SALT` - Fixed salt for devnet; replace with Enoki-returned salt for testnet/mainnet
