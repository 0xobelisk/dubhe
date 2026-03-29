#!/usr/bin/env bash
# Populate world-contracts .env from docker/.env.sui keys.
# Usage: ./scripts/generate-world-env.sh [target-dir]
set -euo pipefail

TARGET_DIR="${1:-/workspace/world-contracts}"
ENV_SUI="/workspace/builder-scaffold/docker/.env.sui"
ENV_EXAMPLE="$TARGET_DIR/env.example"
TARGET_ENV="$TARGET_DIR/.env"

[ -f "$ENV_SUI" ] || { echo "ERROR: $ENV_SUI not found. Start the container first." >&2; exit 1; }
[ -f "$ENV_EXAMPLE" ] || { echo "ERROR: $ENV_EXAMPLE not found. Clone world-contracts first." >&2; exit 1; }

set -a; source <(sed 's/\r$//' "$ENV_SUI"); set +a

for var in ADMIN_ADDRESS ADMIN_PRIVATE_KEY PLAYER_A_PRIVATE_KEY PLAYER_B_PRIVATE_KEY; do
  [ -n "${!var}" ] || { echo "ERROR: $var is empty in $ENV_SUI" >&2; exit 1; }
done

cp "$ENV_EXAMPLE" "$TARGET_ENV"
sed -i "s|^SUI_NETWORK=.*|SUI_NETWORK=${SUI_NETWORK:-localnet}|" "$TARGET_ENV"
sed -i "s|^ADMIN_ADDRESS=.*|ADMIN_ADDRESS=$ADMIN_ADDRESS|" "$TARGET_ENV"
sed -i "s|^SPONSOR_ADDRESSES=.*|SPONSOR_ADDRESSES=$ADMIN_ADDRESS|" "$TARGET_ENV"
sed -i "s|^ADMIN_PRIVATE_KEY=.*|ADMIN_PRIVATE_KEY=$ADMIN_PRIVATE_KEY|" "$TARGET_ENV"
sed -i "s|^GOVERNOR_PRIVATE_KEY=.*|GOVERNOR_PRIVATE_KEY=$ADMIN_PRIVATE_KEY|" "$TARGET_ENV"
sed -i "s|^PLAYER_A_PRIVATE_KEY=.*|PLAYER_A_PRIVATE_KEY=$PLAYER_A_PRIVATE_KEY|" "$TARGET_ENV"
sed -i "s|^PLAYER_B_PRIVATE_KEY=.*|PLAYER_B_PRIVATE_KEY=$PLAYER_B_PRIVATE_KEY|" "$TARGET_ENV"

echo "Generated $TARGET_ENV from $ENV_SUI"
