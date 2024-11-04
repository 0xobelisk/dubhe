## Obelisk Framework

### Testnet
```txt
PackageID: 0xf68ab6ceb5cfce6a73d76e5ef64f28d3cbe684413c80232871b31a9df0e09496                 
Version: 1                                                                                    
Digest: HwpoK2ZUoxsDzFyeszWzdcAm4aLi5g2CxBq3JBodxA16                                        
Modules: access_control, events, resource_id, resource_tyeps, schema, world

ObjectID: 0x9f4cd3e0aa5587b2d9191fa20ea877a0d66c6eb6a4f49ec34328122b29d1d9c6
ObjectType: 0x2::package::UpgradeCap
```

```shell
# upgrade
sui client upgrade --gas-budget 1000000000 --upgrade-capability 0x9f4cd3e0aa5587b2d9191fa20ea877a0d66c6eb6a4f49ec34328122b29d1d9c6
```

