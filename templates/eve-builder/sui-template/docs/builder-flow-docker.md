# Builder flow: Docker

Run the full builder-scaffold flow inside the Sui dev container — no Sui tools needed on your host. The same steps work for any extension example (**smart_gate_extension**, **storage_unit_extension**, or your own);

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- [README Quickstart](../README.md#quickstart) — clone builder-scaffold if not done before.

## 1. Start the container

See [docker/readme.md — Quick start](../docker/readme.md#quick-start):

```bash
cd docker
docker compose run --rm --service-ports sui-dev
```

You get a fresh local node, three funded accounts, and the workspace at `/workspace/` (see [Workspace layout](../docker/readme.md#workspace-layout)).

## 2. Choose your network

Use localnet, or switch to testnet (see [Using testnet](../docker/readme.md#using-testnet)).

## 3. Follow the end-to-end flow

Run all commands **inside the container**.

### 3a. Deploy world and create test resources\*\*

> **Coming soon:** These manual steps will be simplified into a single setup command. Move package dependencies will resolve automatically using [MVR](https://docs.sui.io/guides/developer/packages/move-package-management).

From your workspace directory (parent of `builder-scaffold`), clone world-contracts and deploy:

```bash
git clone -b v0.0.18 https://github.com/evefrontier/world-contracts.git
cd world-contracts
```

Run `/workspace/scripts/generate-world-env.sh` to create `.env` from the container keys (see [docker/readme.md](../docker/readme.md)).

Then:

```bash
pnpm install
pnpm deploy-world localnet    # or testnet
pnpm configure-world localnet # or testnet
pnpm create-test-resources localnet   # or testnet
```

### 3b. Copy world artifacts into builder-scaffold

Follow builder-flow.md#copy-world-artifacts-into-builder-scaffold

### 3c. Publish custom contract

Follow builder-flow.md#publish-custom-contract

### 3d. Configure builder-scaffold .env

Follow builder-flow.md#configure-builder-scaffold-env

### 3e. Interact with Custom Contract

Follow builder-flow.md#run-scripts

## 4. Tear down the container when done

1. **Exit the container** — in the terminal where the container is running, type `exit` (or press Ctrl+D).
2. **Stop and remove the containers** — from your host:

```bash
# From docker folder
docker compose down
```

Otherwise the container keeps running in the background. For a full clean slate (including volumes) or troubleshooting, see [docker/readme.md — Clean up / fresh start](../docker/readme.md#clean-up--fresh-start).
