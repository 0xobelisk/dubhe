export type schema = {
  name: string;
  objectId: string;
};

export type DeploymentJsonType = {
  projectName: string;
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  packageId: string;
  schemas: schema[];
  upgradeCap: string;
  version: number;
};
