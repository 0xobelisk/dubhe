import baseConfig from '../../eslint.config.base.mjs';

export default [
  ...baseConfig,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-case-declarations': 'off',
    },
  },
];
