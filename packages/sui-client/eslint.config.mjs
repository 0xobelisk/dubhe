import baseConfig from '../../eslint.config.base.mjs';

export default [
  ...baseConfig,
  {
    // Client library specific ignore rules
    ignores: [
      '**/scripts/**',
      '**/test/**',
    ],
  },
];