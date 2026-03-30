# Builder flow: Host

Run the builder-scaffold flow on your host, targeting **testnet** or a **local network**. The same steps work for any extension example (**smart_gate_extension**, **storage_unit_extension**, or your own);

> **Prefer Docker?** See [builder-flow-docker.md](builder-flow-docker.md) to run the full flow inside a container with no host tooling.

## Prerequisites

- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install), Node.js, and pnpm installed on your host
  - suiup is recommended for easy upgrades on sui versions
  - Install pnpm `npm i -g pnpm`
- [README Quickstart](../README.md#quickstart) — clone builder-scaffold if not done before.

## 1. Choose your network

**Testnet** — no extra setup; set your CLI to testnet and fund keys via the [faucet](https://faucet.sui.io/).

**Local** — you need a local Sui node running on port 9000.

<details>
<summary>Local node setup</summary>

**Running the Sui node in Docker, commands on host (common):**

1. Start the container in one terminal (it exposes port 9000):

   ```bash
   cd docker
   docker compose run --rm --service-ports sui-dev
   ```

2. In another terminal, point your host Sui CLI at the node:

   ```bash
   sui client new-env --alias localnet --rpc http://127.0.0.1:9000
   ```

3. Wait for the container to log **RPC ready** before running deploy/scripts.

**Using Sui CLI directly (node on host):**

```bash
sui start --with-faucet --force-regenesis
```

Then point your host Sui CLI at the local node:

```bash
sui client new-env --alias localnet --rpc http://127.0.0.1:9000
```

</details>

Switch your Host CLI to the network you're using: `sui client switch --env localnet` or `sui client switch --env testnet`.

## 2. Fund keys (same in three places)

Use the same keys in: Sui keytool (for publish), world-contracts `.env`, and builder-scaffold `.env`.

**If using the Docker local node:**  
Use the three keys in `docker/.env.sui`; import the admin key into keytool and copy all the keys into both `.env` files. Localnet auto-funds them; for testnet, fund all three via the faucet.

**If using your own node (e.g. `sui start --with-faucet` on host):**

- Create three accounts (ADMIN, Player A, Player B):
  - **New addresses:**  
    `sui client new-address ed25519 --alias admin` (and `player-a`, `player-b`)
  - **Or import:**  
    `sui keytool import <PRIVATE_KEY_BASE64> ed25519 --alias admin` (and similarly for player-a, player-b)
- Fund all three (local: `sui client faucet`; testnet: [faucet](https://faucet.sui.io/))
- Get addresses: `sui client addresses`
- For `.env` private keys: `sui keytool export --key admin` (and player-a, player-b)
- Use ADMIN for publishing: `sui client switch --address <ADMIN_ADDRESS>`
- Set these keys and addresses in world-contracts `.env` and builder-scaffold `.env` in the shared flow steps below.

## 3. Follow the end-to-end flow

### 3a. Deploy world and create test resources\*\*

> **Coming soon:** These manual steps will be simplified into a single setup command. See [setup-world/readme.md](../setup-world/readme.md) for details.

From your workspace directory (parent of `builder-scaffold`), clone `world-contracts` at the stable tag as a sibling and deploy:

**Before running the commands below set these environment variables in these [world-contracts/.env](world-contracts/.env) file:**

- `SUI_NETWORK` = testnet (or localnet)
- `ADMIN_ADDRESS` = "sui client active-address"
- `SPONSOR_ADDRESSES` = "sui client active-address" can be the same as `ADMIN_ADDRESS`
- `ADMIN_PRIVATE_KEY` = "sui keytool export --key-identity <ADMIN_ADDRESS>" and copy the `exportedPrivateKey` (`suiprivkeyXYZ`)
- `PLAYER_A_PRIVATE_KEY` = Create another wallet and get private key and fund it
- `PLAYER_B_PRIVATE_KEY` = Create another wallet and get private key and fund it
- `GOVERNOR_PRIVATE_KEY` (OPTIONAL) = "sui client active-address" can be the same as `ADMIN_PRIVATE_KEY`

**ATTENTION:**
The ADMIN_PRIVATE_KEY must have at least 5 sui.

```bash
cd ..   # workspace (parent of builder-scaffold)
git clone -b v0.0.18 https://github.com/evefrontier/world-contracts.git
cd world-contracts
cp env.example .env
# Set SUI_NETWORK=testnet (or localnet) and fill in your keys
# For development, ADMIN_ADDRESS and SPONSOR_ADDRESSES can be the same
# GOVERNOR_PRIVATE_KEY is optional or can be the same as ADMIN_PRIVATE_KEY
pnpm install
pnpm deploy-world localnet       # or testnet
pnpm configure-world localnet    # or testnet
pnpm create-test-resources localnet   # or testnet
```

Check all the created resources in the explorer:

- [localnet explorer](https://custom.suiscan.xyz/custom/checkpoints?network=http%3A%2F%2Flocalhost%3A9000)
- [devnet explorer](https://suiscan.xyz/devnet/)
- [testnet explorer](https://suiscan.xyz/testnet/)
- [mainnet explorer](https://suiscan.xyz/)

### 3b. Copy world artifacts into builder-scaffold

Follow builder-flow.md#copy-world-artifacts-into-builder-scaffold

### 3c. Publish custom contract

Follow builder-flow.md#publish-custom-contract

### 3d. Configure builder-scaffold .env

Follow builder-flow.md#configure-builder-scaffold-env

### 3e. Interact with Custom Contract

Follow builder-flow.md#run-scripts
