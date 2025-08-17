import baseConfig from '../../eslint.config.base.mjs';

export default [
  ...baseConfig,
  {
    // CLI工具特定的忽略规则
    ignores: [
      '**/tests/**',
      '**/scripts/**',
    ],
  },
];