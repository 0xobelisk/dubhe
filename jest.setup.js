// Global test setup
import '@testing-library/jest-dom';

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console.log and console.warn in tests unless explicitly needed
  console.log = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
});

// Global test utilities
global.testUtils = {
  // Mock fetch
  mockFetch: (response) => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response),
      })
    );
  },

  // Mock localStorage
  mockLocalStorage: () => {
    const store = {};
    return {
      getItem: jest.fn((key) => store[key]),
      setItem: jest.fn((key, value) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach((key) => delete store[key]);
      }),
    };
  },

  // Mock sessionStorage
  mockSessionStorage: () => {
    const store = {};
    return {
      getItem: jest.fn((key) => store[key]),
      setItem: jest.fn((key, value) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach((key) => delete store[key]);
      }),
    };
  },

  // Wait for async operations
  waitFor: (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms)),

  // Mock crypto
  mockCrypto: () => {
    Object.defineProperty(global, 'crypto', {
      value: {
        getRandomValues: jest.fn((arr) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        }),
        subtle: {
          generateKey: jest.fn(),
          sign: jest.fn(),
          verify: jest.fn(),
        },
      },
    });
  },
};

// Setup environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DUBHE_TEST_MODE = 'true';

// Mock environment variables
process.env.DUBHE_API_URL = 'http://localhost:3000';
process.env.DUBHE_NETWORK = 'testnet';

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
}); 