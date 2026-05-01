import { DubheConfig } from '../../types';
import { validateConfig } from '../validateConfig';

export const defineConfig = (config: DubheConfig): DubheConfig => {
  validateConfig(config);
  return config;
};
