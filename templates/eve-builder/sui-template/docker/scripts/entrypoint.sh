#!/usr/bin/env bash
# Entrypoint: create keys on first run, start local node, fund accounts, drop to shell.
set -e

SUI_CFG="${SUI_CONFIG_DIR:-/root/.sui}"
KEYSTORE="$SUI_CFG/sui.keystore"
CLIENT_YAML="$SUI_CFG/client.yaml"
INIT_MARKER="$SUI_CFG/.initialized"
ENV_FILE="/workspace/builder-scaffold/docker/.env.sui"

# ---------- first-run: create keys ----------
if [ ! -f "$INIT_MARKER" ]; then
  echo "[sui-dev] First run — initialising keys..."
  mkdir -p "$SUI_CFG"
  printf '%s' '[]' >"$KEYSTORE"
  cat >"$CLIENT_YAML" <<EOF
---
keystore:
  File: $KEYSTORE
envs:
  - alias: localnet
    rpc: "http://127.0.0.1:9000"
  - alias: testnet
    rpc: "https://fullnode.testnet.sui.io"
active_env: localnet
active_address: ~
EOF

  printf 'y\n' | sui client switch --env localnet 2>/dev/null || true

  echo "[sui-dev] Creating keypairs: ADMIN, PLAYER_A, PLAYER_B..."
  for alias in ADMIN PLAYER_A PLAYER_B; do
    printf '\n' | sui client new-address ed25519 "$alias" ||
      {
        echo "[sui-dev] ERROR: failed to create $alias" >&2
        exit 1
      }
  done
  touch "$INIT_MARKER"
  echo "[sui-dev] Keys created."
fi

# ---------- wait for postgres ----------
if [ -n "${SUI_INDEXER_DB_URL:-}" ]; then
  echo "[sui-dev] Waiting for Postgres to be ready..."
  POSTGRES_READY=0
  for i in {1..60}; do
    if pg_isready -d "$SUI_INDEXER_DB_URL" >/dev/null 2>&1; then
      echo "[sui-dev] Postgres is ready."
      POSTGRES_READY=1
      break
    fi
    sleep 1
  done

  if [ "$POSTGRES_READY" -ne 1 ]; then
    echo "[sui-dev] ERROR: Postgres did not become ready" >&2
    exit 1
  fi

  # Reset the indexer database before the node/indexer starts so there are
  # no active connections that would cause DROP DATABASE to fail.
  #
  # Parse the database name from the URL.
  # Supports:  postgresql://user:pass@host:port/dbname
  #            postgresql://user:pass@host:port/dbname?options
  DB_NAME="$(printf '%s' "$SUI_INDEXER_DB_URL" | sed -E 's|.*://[^/]*/([^?]*).*|\1|')"

  # Guard 1: DB_NAME must be non-empty (URL parse failure).
  if [ -z "$DB_NAME" ]; then
    echo "[sui-dev] ERROR: could not parse a database name from SUI_INDEXER_DB_URL" >&2
    exit 1
  fi

  # Guard 2: only allow safe identifiers — letters, digits, underscores,
  # first character must not be a digit.  Rejects hyphens, spaces, injection, etc.
  if ! printf '%s' "$DB_NAME" | grep -qE '^[a-zA-Z_][a-zA-Z0-9_]{0,62}$'; then
    echo "[sui-dev] ERROR: parsed DB_NAME '$DB_NAME' is not a valid identifier." >&2
    echo "          Use only letters, digits and underscores; must not start with a digit; max 63 chars." >&2
    exit 1
  fi

  # Build an admin connection URL targeting the always-present 'postgres' database
  # so we can DROP / CREATE the target database while no one is connected to it.
  ADMIN_DB_URL="$(printf '%s' "$SUI_INDEXER_DB_URL" | sed -E 's|(://[^/]*)/[^?]*|\1/postgres|')"

  echo "[sui-dev] Resetting indexer database '$DB_NAME' before node start..."

  # DB_NAME has been validated above (^[a-zA-Z_][a-zA-Z0-9_]{0,62}$), so it is
  # safe to embed inside SQL double-quotes.  Standard double-quoting is used
  # instead of psql :"variable" interpolation, which is unreliable across psql
  # versions when passed via -c.
  # ON_ERROR_STOP=1 ensures non-zero exit on SQL errors.
  # stderr is intentionally NOT redirected so failures are fully visible.
  psql "$ADMIN_DB_URL" \
    --set ON_ERROR_STOP=1 \
    -c "DROP DATABASE IF EXISTS \"${DB_NAME}\"" \
    -c "CREATE DATABASE \"${DB_NAME}\""

  echo "[sui-dev] Indexer database '$DB_NAME' ready."
fi

# ---------- start local node ----------
echo "[sui-dev] Starting local Sui node..."
if [ -n "${SUI_INDEXER_DB_URL:-}" ]; then
  sui start --with-faucet --force-regenesis --with-indexer="$SUI_INDEXER_DB_URL" --with-graphql=0.0.0.0:9125 &
else
  sui start --with-faucet --force-regenesis &
fi
NODE_PID=$!
trap 'kill "$NODE_PID" 2>/dev/null || true' EXIT

echo "[sui-dev] Waiting for RPC on port 9000..."
for i in $(seq 1 60); do
  curl -s -o /dev/null http://127.0.0.1:9000 2>/dev/null && break
  if [ "$i" -eq 60 ]; then
    echo "[sui-dev] ERROR: RPC did not become ready" >&2
    kill $NODE_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done
echo "[sui-dev] RPC responding, waiting for full initialization..."
sleep 5
echo "[sui-dev] Node ready."

# ---------- fund accounts ----------
printf 'y\n' | sui client switch --env localnet 2>/dev/null || true
echo "[sui-dev] Funding accounts from faucet..."
for alias in ADMIN PLAYER_A PLAYER_B; do
  sui client switch --address "$alias"
  for attempt in 1 2 3; do
    sui client faucet 2>&1 && break
    [ "$attempt" -eq 3 ] && {
      echo "[sui-dev] Faucet failed for $alias" >&2
      exit 1
    }
    sleep 2
  done
done
sui client switch --address ADMIN

# ---------- write .env.sui for TS scripts ----------
get_address() { sui keytool export --key-identity "$1" --json 2>/dev/null | jq -r '.key.suiAddress'; }
get_key() { sui keytool export --key-identity "$1" --json 2>/dev/null | jq -r '.exportedPrivateKey'; }

require_val() {
  if [ -z "$2" ] || [ "$2" = "null" ]; then
    echo "[sui-dev] ERROR: failed to export $1" >&2
    exit 1
  fi
}

ADMIN_ADDRESS=$(get_address ADMIN)
PLAYER_A_ADDRESS=$(get_address PLAYER_A)
PLAYER_B_ADDRESS=$(get_address PLAYER_B)
ADMIN_PRIVATE_KEY=$(get_key ADMIN)
PLAYER_A_PRIVATE_KEY=$(get_key PLAYER_A)
PLAYER_B_PRIVATE_KEY=$(get_key PLAYER_B)

for var in ADMIN_ADDRESS PLAYER_A_ADDRESS PLAYER_B_ADDRESS \
  ADMIN_PRIVATE_KEY PLAYER_A_PRIVATE_KEY PLAYER_B_PRIVATE_KEY; do
  require_val "$var" "${!var}"
done

mkdir -p "$(dirname "$ENV_FILE")"
cat >"$ENV_FILE" <<EOF
# Generated by entrypoint.sh — local Sui keys for TypeScript scripts
SUI_NETWORK=localnet
SUI_RPC_URL=http://127.0.0.1:9000
ADMIN_ADDRESS=$ADMIN_ADDRESS
PLAYER_A_ADDRESS=$PLAYER_A_ADDRESS
PLAYER_B_ADDRESS=$PLAYER_B_ADDRESS
ADMIN_PRIVATE_KEY=$ADMIN_PRIVATE_KEY
PLAYER_A_PRIVATE_KEY=$PLAYER_A_PRIVATE_KEY
PLAYER_B_PRIVATE_KEY=$PLAYER_B_PRIVATE_KEY
EOF
chmod 600 "$ENV_FILE"

# ---------- ready ----------
echo ""
echo "================================================"
echo " Sui dev environment ready"
echo " Local node RPC: http://127.0.0.1:9000"
echo " Keys:           docker/.env.sui"
echo "================================================"
echo ""
echo "Layout:"
echo "  /workspace/builder-scaffold/   – repo (syncs with host)"
echo "  /workspace/world-contracts/    – mount for world-contracts (syncs with host)"
echo ""
echo "Quick start:"
echo "  cd /workspace/builder-scaffold/move-contracts/smart_gate_extension"
echo "  sui move build -e testnet"
echo ""

exec "${@:-bash}"
