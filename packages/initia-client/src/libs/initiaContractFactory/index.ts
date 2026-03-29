import type { ContractFactoryParams, MoveModule } from './types';

export class InitiaContractFactory {
  public packageId: string;
  public metadata: MoveModule[] | undefined;

  /**
   * @param packageId
   * @param metadata
   */
  constructor({ packageId, metadata }: ContractFactoryParams = {}) {
    this.packageId = packageId || '';
    this.metadata = metadata || undefined;
  }
}
