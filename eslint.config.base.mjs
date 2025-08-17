import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';

// Unified ESLint configuration for Dubhe project
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Global ignore rules - improve lint performance
    ignores: [
      // Dependencies and build artifacts
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/target/**',
      '**/.turbo/**',
      '**/coverage/**',
      
      // Generated files and configuration files
      '**/*.js',
      '**/*.mjs', 
      '**/*.d.ts',
      '**/Move.lock',
      '**/.chk/**',
      '**/node_logs/**',
      '**/*.nohup.out',
      '**/sui.log.*',
      '**/.next/**',
      '**/out/**',
      
      // Dubhe specific generated files
      '**/packages/contracts/src/dubhe/**',
      '**/packages/contracts/deployment.ts',
      '**/packages/contracts/dubhe.config.json',
      '**/packages/contracts/metadata.json',
      '**/packages/contracts/**/.history/**',
      
      // gRPC generated proto files
      '**/packages/grpc-client/src/proto/**',
      '**/packages/*/src/proto/**',
      
      // IDE and system files
      '**/.idea/**',
      '**/.vscode/**',
      '**/.DS_Store',
      
      // Template files 
      '**/template/**',
      '**/templates/**',
      
      // scripts directory in packages - development scripts, don't need strict lint
      '**/packages/*/scripts/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      prettier: prettier,
    },
    rules: {
      // Prettier integration - use warn instead of error
      'prettier/prettier': 'warn',
      
      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off', 
      '@typescript-eslint/no-empty-object-type': 'off',
      
      // JavaScript rules
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'prefer-const': 'off',
      'no-prototype-builtins': 'off',
      'no-useless-catch': 'off',
      'no-case-declarations': 'off',
      'no-fallthrough': 'off',
    },
  }
);
