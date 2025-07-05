import type { ModuleABIView } from '@roochnetwork/rooch-sdk';

export type ContractFactoryParams = {
  packageId?: string;
  metadata?: ModuleABIView[];
};
