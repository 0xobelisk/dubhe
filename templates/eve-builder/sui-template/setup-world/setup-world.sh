#!/usr/bin/env bash
# Deploy world contracts, configure, and seed test resources.
# Run from the world-contracts repo, or set WORLD_CONTRACTS_DIR.
#
# Usage:
#   ./setup-world.sh                          # run from world-contracts dir
#   WORLD_CONTRACTS_DIR=../world-contracts ./setup-world.sh

set -euo pipefail

WORLD_DIR="${WORLD_CONTRACTS_DIR:-$(pwd)}"
NETWORK="${SUI_NETWORK:-localnet}"
DELAY_SECONDS="${DELAY_SECONDS:-2}"

cd "$WORLD_DIR"

echo "=== Deploying world contracts ($NETWORK) ==="
pnpm install || { echo "ERROR: pnpm install failed"; exit 1; }
pnpm deploy-world "$NETWORK" || { echo "ERROR: deploy-world failed"; exit 1; }
sleep "$DELAY_SECONDS"

echo "=== Configuring world ==="
pnpm configure-world "$NETWORK" || { echo "ERROR: configure-world failed"; exit 1; }
sleep "$DELAY_SECONDS"

echo "=== Seeding test resources ==="
pnpm create-test-resources "$NETWORK" || { echo "ERROR: create-test-resources failed"; exit 1; }

echo ""
echo "Done. Deployment output: $WORLD_DIR/deployments/$NETWORK/"
echo ""
echo "Copy to builder-scaffold:"
echo "  cp -r deployments/ <builder-scaffold>/deployments/"
echo "  cp test-resources.json <builder-scaffold>/test-resources.json"
