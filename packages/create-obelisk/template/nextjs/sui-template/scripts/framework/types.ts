export type FrameworkDeploymentJsonType = {
  projectName: string;
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  packageId: string;
  upgradeCap: string;
  dappsObjectId: string;
  version: number;
};
