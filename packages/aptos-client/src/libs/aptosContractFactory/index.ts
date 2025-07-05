import type { ContractFactoryParams } from './types';
import type { MoveModule } from '@aptos-labs/ts-sdk';
export type ApiTypes = 'promise' | 'rxjs';

export class AptosContractFactory {
  public packageId: string;
  public metadata: MoveModule[] | undefined;
  constructor({ packageId, metadata }: ContractFactoryParams = {}) {
    this.packageId = packageId || '';
    this.metadata = metadata || undefined;
  }
}
