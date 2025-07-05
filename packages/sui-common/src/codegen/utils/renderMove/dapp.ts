import { DubheConfig } from '../../types';

const checkDuplicateKeys = (config: DubheConfig): void => {
  const componentKeys = Object.keys(config.components || {});
  const resourceKeys = Object.keys(config.resources || {});
  
  const duplicates = componentKeys.filter(key => resourceKeys.includes(key));
  
  if (duplicates.length > 0) {
    throw new Error(`Duplicate keys found between components and resources: ${duplicates.join(', ')}`);
  }
};

export const defineConfig = (config: DubheConfig): DubheConfig => {
  checkDuplicateKeys(config);
  return config;
};