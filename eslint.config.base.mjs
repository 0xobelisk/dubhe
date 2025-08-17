import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';

// Dubhe项目的统一ESLint配置
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // 全局忽略规则 - 提高lint性能
    ignores: [
      // 依赖和构建产物
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/target/**',
      '**/.turbo/**',
      '**/coverage/**',
      
      // 生成的文件和配置文件
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
      
      // Dubhe特定生成文件
      '**/packages/contracts/src/dubhe/**',
      '**/packages/contracts/deployment.ts',
      '**/packages/contracts/dubhe.config.json',
      '**/packages/contracts/metadata.json',
      '**/packages/contracts/**/.history/**',
      
      // gRPC生成的proto文件
      '**/packages/grpc-client/src/proto/**',
      '**/packages/*/src/proto/**',
      
      // IDE和系统文件
      '**/.idea/**',
      '**/.vscode/**',
      '**/.DS_Store',
      
      // 模板文件 
      '**/template/**',
      '**/templates/**',
      
      // packages中的scripts目录 - 开发脚本，不需要严格lint
      '**/packages/*/scripts/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      prettier: prettier,
    },
    rules: {
      // Prettier集成 - 使用warn而不是error
      'prettier/prettier': 'warn',
      
      // TypeScript规则
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
      
      // JavaScript规则
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
