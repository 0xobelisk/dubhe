import baseConfig from '../../eslint.config.base.mjs';

export default [
  ...baseConfig,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'prettier/prettier': 'off',
      'no-useless-escape': 'off',
    },
  },
];