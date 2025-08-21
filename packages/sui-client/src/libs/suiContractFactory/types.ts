import type { SuiMoveNormalizedModules, SuiMoveNormalizedType } from '@mysten/sui/client';

export type ContractFactoryParams = {
  packageId?: string;
  metadata?: SuiMoveNormalizedModules;
};

export type SuiMoveMoudleValueType = {
  address: string;
  name: string;
  fileFormatVersion: number;
  friends: {
    address: string;
    name: string;
  }[];
  structs: Record<
    string,
    {
      fields: {
        type: SuiMoveNormalizedType;
        name: string;
      }[];
      abilities: {
        abilities: string[];
      };
      typeParameters: {
        constraints: {
          abilities: string[];
        };
        isPhantom: boolean;
      }[];
    }
  >;
  exposedFunctions: Record<
    string,
    {
      visibility: 'Private' | 'Public' | 'Friend';
      isEntry: boolean;
      typeParameters: {
        abilities: string[];
      }[];
      parameters: SuiMoveNormalizedType[];
      return: SuiMoveNormalizedType[];
    }
  >;
};

export type SuiMoveMoudleFuncType = {
  moduleName: string;
  funcName: string;
  visibility: 'Private' | 'Public' | 'Friend';
  isEntry: boolean;
  typeParameters: {
    abilities: string[];
  }[];
  parameters: SuiMoveNormalizedType[];
  return: SuiMoveNormalizedType[];
};
