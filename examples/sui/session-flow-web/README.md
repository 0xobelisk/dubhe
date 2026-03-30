# Session Flow Web Example

A standalone frontend in `examples/sui/session-flow-web` for testing the full session flow:

1. owner creates and binds `SessionCap` for delegate
2. delegate executes nonce-protected writes
3. delegate revokes the cap

## Quick Start

```bash
cd examples/sui/session-flow-web
pnpm install
pnpm dev
```

Open: `http://127.0.0.1:4310`

## Modes

- `mock`: deterministic UI/API smoke, no chain transaction
- `live`: real on-chain flow via `@0xobelisk/sui-client`

## Live Mode Inputs

`/api/session-flow/run` expects:

```json
{
  "mode": "live",
  "config": {
    "...": "..."
  }
}
```

Required `config` fields:

- `networkType`
- `frameworkPackageId`
- `dappHubId`
- `sessionRegistryId`
- `ownerSecretKey`
- `delegateSecretKey`

Optional:

- `appPackageId` (defaults to `frameworkPackageId`)
- `dappKeyType` (defaults to `${appPackageId}::dapp_key::DappKey`)
- `sessionCapId` (skip create phase)
- `delegateAddress` (override derived address)
- `scopeMask`, `maxUses`, `expiresInMinutes`, `recordKey`, `recordValueU32`

## 101 Localnet E2E

From repo root (`dubhe/`), this runs `session-flow-web` live mode against the latest
`templates/101/sui-template` localnet deployment:

```bash
node <<'NODE'
const { execSync } = require('node:child_process');
const fs = require('node:fs');

const dubheLatest = JSON.parse(fs.readFileSync('templates/101/sui-template/packages/contracts/src/dubhe/.history/sui_localnet/latest.json', 'utf8'));
const counterLatest = JSON.parse(fs.readFileSync('templates/101/sui-template/packages/contracts/src/counter/.history/sui_localnet/latest.json', 'utf8'));

const ownerSecretKey = execSync("sui keytool export --key-identity qingyi-admin | rg -o 'suiprivkey[0-9a-z]+' -m 1", { encoding: 'utf8' }).trim();
const delegateSecretKey = execSync("sui keytool export --key-identity naughty-alexandrite | rg -o 'suiprivkey[0-9a-z]+' -m 1", { encoding: 'utf8' }).trim();
const publishTx = execSync(`sui client object ${dubheLatest.upgradeCap} --json | jq -r '.previous_transaction'`, { encoding: 'utf8' }).trim();
const sessionRegistryId = execSync(`sui client tx-block ${publishTx} --json | jq -r '.objectChanges[] | select(.type=="created" and (.objectType | endswith("::session_registry::SessionRegistry"))) | .objectId'`, { encoding: 'utf8' }).trim();

const payload = {
  mode: 'live',
  config: {
    networkType: 'localnet',
    frameworkPackageId: dubheLatest.packageId,
    appPackageId: counterLatest.packageId,
    dappHubId: dubheLatest.dappHub,
    sessionRegistryId,
    ownerSecretKey,
    delegateSecretKey,
    scopeMask: 5,
    maxUses: 20,
    expiresInMinutes: 10,
    recordKey: 'session-demo',
    recordValueU32: 1
  }
};

(async () => {
  const res = await fetch('http://127.0.0.1:4310/api/session-flow/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log(JSON.stringify(await res.json(), null, 2));
  if (!res.ok) process.exit(1);
})();
NODE
```

## API Smoke

Start dev server in one terminal, then run:

```bash
pnpm smoke:api
```
