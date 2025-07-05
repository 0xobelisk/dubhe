import type { SuiMoveNormalizedModules } from '@mysten/sui/client';
import type { ContractFactoryParams, SuiMoveMoudleValueType } from './types';
export type ApiTypes = 'promise' | 'rxjs';

// export interface ContractQuery {
//   (origin: AccountId | string | Uint8Array, options: ContractOptions, ...params: unknown[]): SuiTransactionBlockResponse<ApiType, ContractCallOutcome>;
// }

// export type MapMessageQuery<ApiType extends ApiTypes> = Record<string, ContractQuery<ApiType>>;

// // function createQuery <ApiType extends ApiTypes> (meta: AbiMessage, fn: (origin: string | AccountId | Uint8Array, options: ContractOptions, params: unknown[]) => ContractCallResult<ApiType, ContractCallOutcome>): ContractQuery<ApiType> {
// //   return withMeta(meta, (origin: string | AccountId | Uint8Array, options: ContractOptions, ...params: unknown[]): ContractCallResult<ApiType, ContractCallOutcome> =>
// //     fn(origin, options, params)
// //   );
// // }

// export type MapMessageTx<ApiType extends ApiTypes> = Record<string, ContractTx<ApiType>>;

// export interface ContractOptions {
//   gasLimit?: bigint | string | number | BN | WeightV2;
//   storageDepositLimit?: bigint | string | number | BN | null;
//   value?: bigint | BN | string | number;
// }

// export interface ContractTx {
//   (options: ContractOptions, ...params: unknown[]): SubmittableExtrinsic<ApiType>;
// }
export class SuiContractFactory {
  public packageId: string;
  public metadata: SuiMoveNormalizedModules | undefined;
  // readonly #query: MapMessageQuery<ApiTypes> = {};
  // readonly #tx: MapMessageTx<ApiTypes> = {};
  /**
   * Support the following ways to init the SuiToolkit:
   * 1. mnemonics
   * 2. secretKey (base64 or hex)
   * If none of them is provided, will generate a random mnemonics with 24 words.
   *
   * @param mnemonics, 12 or 24 mnemonics words, separated by space
   * @param secretKey, base64 or hex string, when mnemonics is provided, secretKey will be ignored
   */
  constructor({ packageId, metadata }: ContractFactoryParams = {}) {
    // If the mnemonics or secretKey is provided, use it
    // Otherwise, generate a random mnemonics with 24 words
    this.packageId = packageId || '';
    this.metadata = metadata || undefined;
  }

  getFuncByModuleName(moduleName: string) {
    Object.values(this.metadata as SuiMoveNormalizedModules).forEach(
      (value) => {
        const data = value as SuiMoveMoudleValueType;
        console.log(`moudle name: ${data.name}`);
        // console.log(data.exposedFunctions)
        Object.entries(data.exposedFunctions).forEach(([key, value]) => {
          console.log(`\tfunc name: ${key}`);
          Object.values(value.parameters).forEach((values) => {
            // console.log(values)
          });
        });
      }
    );
  }

  getAllFunc() {
    Object.values(this.metadata as SuiMoveNormalizedModules).forEach(
      (value) => {
        const data = value as SuiMoveMoudleValueType;
        console.log(`moudle name: ${data.name}`);
        // console.log(data.exposedFunctions)
        Object.entries(data.exposedFunctions).forEach(([key, value]) => {
          console.log(`\tfunc name: ${key}`);
          console.log(`\t\t${value.parameters.length}`);
          Object.values(value.parameters).forEach((values) => {
            // console.log(values)
            console.log(`\t\targs: ${values}`);
          });
        });
      }
    );
  }

  getAllModule() {
    Object.values(this.metadata as SuiMoveNormalizedModules).forEach(
      (value, index) => {
        const data = value as SuiMoveMoudleValueType;
        console.log(`${index}. ${data.name}`);
      }
    );
  }

  //   async call(arguments: ({
  //     kind: "Input";
  //     index: number;
  //     type?: "object" | "pure" | undefined;
  //     value?: any;
  // } | {
  //     kind: "GasCoin";
  // } | {
  //     kind: "Result";
  //     index: number;
  // } | {
  //     kind: "NestedResult";
  //     index: number;
  //     resultIndex: number;
  // })[], derivePathParams?: DerivePathParams) {
  //     const tx = new TransactionBlock();
  //     tx.moveCall({
  //       target: `${this.packageId}::${}::${}`,
  //       arguments,
  //     })
  //     return ;
  //   }
}

// function createTx <ApiType extends ApiTypes> (meta: AbiMessage, fn: (options: ContractOptions, params: unknown[]) => SubmittableExtrinsic<ApiType>): ContractTx<ApiType> {
//   return withMeta(meta, (options: ContractOptions, ...params: unknown[]): SubmittableExtrinsic<ApiType> =>
//     fn(options, params)
//   );
// }
