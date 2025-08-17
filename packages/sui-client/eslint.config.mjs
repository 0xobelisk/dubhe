import baseConfig from '../../eslint.config.base.mjs';

export default [
  ...baseConfig,
  {
    // 客户端库特定的忽略规则
    ignores: [
      '**/scripts/**',
      '**/test/**',
    ],
  },
];