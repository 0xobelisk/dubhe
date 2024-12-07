import { InitiaInteractor, getDefaultURL } from '../libs/initiaInteractor';
import { NetworkType, MoveModule } from '../types';

export async function loadMetadata(
  networkType: NetworkType,
  packageId: string,
  fullnodeUrls?: string[]
): Promise<MoveModule[] | undefined> {
  // Init the rpc provider
  fullnodeUrls = fullnodeUrls ?? [getDefaultURL(networkType).rest];
  const initiaInteractor = new InitiaInteractor(fullnodeUrls, networkType);
  if (packageId !== undefined) {
    // let allModules: Module[] = [];
    let allModules: MoveModule[] = [];
    let nextKey: string | undefined = undefined;

    do {
      const modules = await initiaInteractor.getModules(packageId, {
        'pagination.key': nextKey,
      });
      for (const module of modules[0]) {
        allModules.push(JSON.parse(module.abi) as MoveModule);
      }
      nextKey = modules[1].next_key;
    } while (nextKey !== null);

    return allModules;
  } else {
    console.error('please set your package id.');
  }
}
