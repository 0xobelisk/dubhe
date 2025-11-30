/**
 * Global test setup file
 * Runs once before all tests
 */

// Add any global test setup here
// For example, environment variables, global mocks, etc.

// Mock console methods to reduce noise in test output
// Comment out if you need to see console output during debugging
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  // Keep error for debugging
  error: console.error
};

// You can add more global setup here
export {};
