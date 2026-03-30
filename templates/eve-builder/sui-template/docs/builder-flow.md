# Builder flow

End-to-end flow to test builder-scaffold against world-contracts.

**Choose one path, then follow that guide’s steps from start to finish:**

| Choice     | Guide                                              | When to use it                                                                 |
| ---------- | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Docker** | [builder-flow-docker.md](./builder-flow-docker.md) | No Sui/Node on your machine; run everything in a container (local or testnet). |
| **Host**   | [builder-flow-host.md](./builder-flow-host.md)     | Sui CLI and Node.js on your machine; target local or testnet from the host.    |

**Path convention:** Ensure **world-contracts** is a sibling of **builder-scaffold** in your workspace (e.g. `workspace/world-contracts` and `workspace/builder-scaffold` on host, or `/workspace/world-contracts` and `/workspace/builder-scaffold` in Docker). All commands use paths relative to that layout.

---

## Copy world artifacts into builder-scaffold

```bash
NETWORK=localnet   # or testnet
mkdir -p ../builder-scaffold/deployments/$NETWORK/
cp -r deployments/* ../builder-scaffold/deployments/
cp test-resources.json ../builder-scaffold/test-resources.json
cp "contracts/world/Pub.localnet.toml" "../builder-scaffold/deployments/localnet/Pub.localnet.toml"
```

<a id="publish-custom-contract"></a>

## Publish custom contract

Use any example (e.g. **smart_gate_extension** or **storage_unit_extension**) from `move-contracts/`:

```bash
# In host , move to the builder-scaffold root directory first
cd move-contracts/smart_gate_extension   # or storage_unit_extension, or your package
```

- **Localnet:**  
  `sui client test-publish --build-env testnet --pubfile-path ../../deployments/localnet/Pub.localnet.toml`
- **Testnet:**  
  `sui client publish -e testnet`

<a id="configure-builder-scaffold-env"></a>

## Configure builder-scaffold .env

```bash
cd ../../
# From builder scaffold root
cp .env.example .env
```

Set in .env:

- Same keys/addresses as used for world deployment
- `SUI_NETWORK`=testnet or localnet
- `WORLD_PACKAGE_ID`— from deployments/<network>/extracted-object-ids.json (world.packageId)
- Set `BUILDER_PACKAGE_ID` and `EXTENSION_CONFIG_ID` in `.env` from the publish output.

Those values are in the output of the publish command:

1. `BUILDER_PACKAGE_ID` = changed_objects.objectId where objectType === "package"
2. `EXTENSION_CONFIG_ID` = changed_objects.objectId where objectType ends with "config::ExtensionConfig"

<a id="run-scripts"></a>

## Interact with Custom Contract

From **builder-scaffold** root (e.g. for **smart_gate_extension**):

<!-- TODO: You can add references to additional example scripts when they're available -->

```bash
# from builder-scaffold root
pnpm install
pnpm configure-rules
pnpm authorise-gate-extension
pnpm authorise-storage-unit-extension
pnpm issue-tribe-jump-permit
pnpm jump-with-permit
pnpm collect-corpse-bounty
```
