// E2E test setup
import '@testing-library/jest-dom';

// E2E specific mocks and configurations
beforeAll(async () => {
  // Setup E2E test environment
  process.env.NODE_ENV = 'test';
  process.env.DUBHE_E2E_MODE = 'true';
  
  // Mock blockchain network for E2E tests
  process.env.DUBHE_NETWORK = 'localnet';
  process.env.DUBHE_API_URL = 'http://localhost:8080';
  
  // Increase timeout for E2E tests
  jest.setTimeout(60000);
});

afterAll(async () => {
  // Cleanup E2E test environment
  process.env.DUBHE_E2E_MODE = 'false';
});

// E2E test utilities
global.e2eUtils = {
  // Wait for network requests to complete
  waitForNetworkIdle: async (timeout = 5000) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkIdle = () => {
        if (Date.now() - startTime > timeout) {
          resolve();
        } else {
          setTimeout(checkIdle, 100);
        }
      };
      checkIdle();
    });
  },

  // Mock blockchain responses
  mockBlockchainResponse: (response) => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response)),
      })
    );
  },

  // Mock WebSocket connections
  mockWebSocket: () => {
    const listeners = {};
    const mockWs = {
      addEventListener: jest.fn((event, callback) => {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        listeners[event].push(callback);
      }),
      removeEventListener: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1, // OPEN
      triggerEvent: (event, data) => {
        if (listeners[event]) {
          listeners[event].forEach(callback => callback(data));
        }
      },
    };
    
    global.WebSocket = jest.fn(() => mockWs);
    return mockWs;
  },

  // Mock file system for E2E tests
  mockFileSystem: () => {
    const files = {};
    return {
      readFile: jest.fn((path) => Promise.resolve(files[path] || '')),
      writeFile: jest.fn((path, content) => {
        files[path] = content;
        return Promise.resolve();
      }),
      exists: jest.fn((path) => Promise.resolve(!!files[path])),
      mkdir: jest.fn(() => Promise.resolve()),
      rmdir: jest.fn(() => Promise.resolve()),
      unlink: jest.fn((path) => {
        delete files[path];
        return Promise.resolve();
      }),
    };
  },

  // Mock crypto for E2E tests
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
          generateKey: jest.fn(() => Promise.resolve({})),
          sign: jest.fn(() => Promise.resolve(new Uint8Array(64))),
          verify: jest.fn(() => Promise.resolve(true)),
          importKey: jest.fn(() => Promise.resolve({})),
          exportKey: jest.fn(() => Promise.resolve(new Uint8Array(32))),
        },
      },
    });
  },

  // Mock clipboard API
  mockClipboard: () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn(() => Promise.resolve()),
        readText: jest.fn(() => Promise.resolve('')),
      },
    });
  },

  // Mock notifications API
  mockNotifications: () => {
    Object.defineProperty(global, 'Notification', {
      value: jest.fn().mockImplementation(() => ({
        close: jest.fn(),
      })),
    });
    
    Object.defineProperty(Notification, 'permission', {
      value: 'granted',
      writable: true,
    });
    
    Object.defineProperty(Notification, 'requestPermission', {
      value: jest.fn(() => Promise.resolve('granted')),
    });
  },

  // Mock indexedDB for E2E tests
  mockIndexedDB: () => {
    const db = {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve()),
          put: jest.fn(() => Promise.resolve()),
          delete: jest.fn(() => Promise.resolve()),
          clear: jest.fn(() => Promise.resolve()),
        })),
      })),
    };
    
    global.indexedDB = {
      open: jest.fn(() => Promise.resolve(db)),
      deleteDatabase: jest.fn(() => Promise.resolve()),
    };
  },
};

// Setup global error handlers for E2E tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('E2E Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('E2E Uncaught Exception:', error);
}); 