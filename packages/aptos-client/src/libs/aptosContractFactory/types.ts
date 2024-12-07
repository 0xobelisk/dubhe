import {
  MoveModule,
  MoveModuleId,
  MoveStruct,
  MoveFunction,
  MoveFunctionVisibility,
  MoveFunctionGenericTypeParam,
  MoveType,
} from '@aptos-labs/ts-sdk';
export type ContractFactoryParams = {
  packageId?: string;
  metadata?: MoveModule[];
};

export type MoveModuleValueType = {
  address: string;
  name: string;
  friends: MoveModuleId[];
  structs: MoveStruct[];
  exposed_functions: MoveFunction[];
};

export type MoveModuleFuncType = {
  contractAddress: string;
  moduleName: string;
  funcName: string;
  visibility: MoveFunctionVisibility;
  isEntry: boolean;
  isView: boolean;
  typeParameters: MoveFunctionGenericTypeParam[];
  parameters: MoveType[];
  return: MoveType[];
};
