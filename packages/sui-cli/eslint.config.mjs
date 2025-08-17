import baseConfig from '../../eslint.config.base.mjs';

export default [
  ...baseConfig,
  {
    // CLI tool specific ignore rules
    ignores: [
      '**/tests/**',
      '**/scripts/**',
    ],
  },
];