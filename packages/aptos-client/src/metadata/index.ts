import { NetworkType } from '../types';
import { AptosInteractor, getDefaultURL } from '../libs/aptosInteractor';
import { MoveModule } from '@aptos-labs/ts-sdk';

export async function loadMetadata(
  networkType: NetworkType,
  packageId: string,
  fullnodeUrls?: string[]
): Promise<MoveModule[] | undefined> {
  // Init the rpc provider
  fullnodeUrls = fullnodeUrls || [getDefaultURL(networkType).fullNode];
  const aptosInteractor = new AptosInteractor(fullnodeUrls, networkType);
  if (packageId !== undefined) {
    const jsonData = await aptosInteractor.getAccountModules(packageId);
    return jsonData.map((data) => data.abi!);
  } else {
    console.error('please set your package id.');
  }
}
