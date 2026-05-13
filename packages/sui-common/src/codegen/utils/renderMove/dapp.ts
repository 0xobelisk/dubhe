import { DubheConfig } from '../../types';
import { validateConfigErrors } from '../validateConfig';

export const defineConfig = (config: DubheConfig): DubheConfig => {
  validateConfigErrors(config);
  return config;
};
