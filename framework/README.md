# dubhe-framework

The on-chain Dubhe framework (Sui Move) that DApp contracts build on. The authoritative,
always-current deployment records live in `src/dubhe/.history/sui_<network>/latest.json`
(and the per-package files alongside them). The values below are a convenience snapshot —
prefer `latest.json` if they ever differ.

### Testnet

```txt
PackageID:  0xae33be6675639d6f1a5c468ae6bbc457ae4e22e57cd7526741d6143ce219d995
DappHubId:  0x80391929a8772aba091156fd1f099bf79240d2cf4471a14026b4aa68e3a240cc
UpgradeCap: 0x7e1d143b109812cb2ce65ff736a2de7490112b7891a56bb90fc1298a45974b1a
Version:    1
```

### Mainnet

```txt
PackageID:  0x5bc40de124588b1e3514ca50f5e7109869351c4d9544e5f0cb9d30dd47bf8de7
DappHubId:  0x96e92d9baccfd0a2927b4f209756e1edbc18904bff34e486e4bb4a151320e1e5
UpgradeCap: 0x038d25f8bc8c0542ff406b36f4e9e700f22dc54d0104cca4baae58e4bb5b59af
Version:    1
```

For the framework architecture, modules, and the deploy/upgrade procedure, see `DEPLOY.md`
and the published docs at https://dubhe-docs.obelisk.build/.
