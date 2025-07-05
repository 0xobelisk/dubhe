module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // File extensions to test
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/packages/*/src/**/__tests__/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/packages/*/src/**/*.{test,spec}.{ts,tsx,js,jsx}',
    '<rootDir>/templates/*/src/**/__tests__/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/templates/*/src/**/*.{test,spec}.{ts,tsx,js,jsx}',
    '<rootDir>/e2e-tests/**/*.{test,spec}.{ts,tsx,js,jsx}',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,tsx,js,jsx}',
    'templates/*/src/**/*.{ts,tsx,js,jsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**',
    '!**/*.config.{ts,tsx,js,jsx}',
    '!**/index.{ts,tsx,js,jsx}',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  
  // Module name mapping
  moduleNameMapping: {
    '^@0xobelisk/(.*)$': '<rootDir>/packages/$1/src',
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Projects configuration for monorepo
  projects: [
    {
      displayName: 'packages',
      testMatch: ['<rootDir>/packages/*/src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
      testEnvironment: 'node',
    },
    {
      displayName: 'templates',
      testMatch: ['<rootDir>/templates/*/src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
      testEnvironment: 'node',
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/e2e-tests/**/*.{test,spec}.{ts,tsx,js,jsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.e2e.setup.js'],
    },
  ],
}; 