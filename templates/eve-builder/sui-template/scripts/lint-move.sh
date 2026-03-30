#!/usr/bin/env sh
# Lint all Move packages in move-contracts/
set -e
for dir in move-contracts/*/; do
  [ -f "${dir}Move.toml" ] && sui move build --path "${dir%/}" --lint
done
