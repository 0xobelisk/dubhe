#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${CONTRACTS_DIR}/../../../../.." && pwd)"

cd "${CONTRACTS_DIR}"
"${REPO_ROOT}/node_modules/.bin/tsx" "${REPO_ROOT}/packages/sui-cli/src/dubhe.ts" "$@"
