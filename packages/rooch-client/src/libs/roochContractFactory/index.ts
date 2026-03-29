import type { ContractFactoryParams } from './types';
import type { ModuleABIView } from '@roochnetwork/rooch-sdk';

export class RoochContractFactory {
  public packageId: string;
  public metadata: ModuleABIView[] | undefined;

  /**
   * @param packageId
   * @param metadata
   */
  constructor({ packageId, metadata }: ContractFactoryParams = {}) {
    this.packageId = packageId || '';
    this.metadata = metadata || undefined;
  }
}
