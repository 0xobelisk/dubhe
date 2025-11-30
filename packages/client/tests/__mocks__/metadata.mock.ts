/**
 * Mock metadata for testing
 */

export const mockMetadata = {
  name: 'test-package',
  version: '1.0.0',
  schemas: {
    Counter: {
      fields: {
        value: 'u64'
      }
    }
  },
  systems: ['counter_system']
};

export const mockDubheMetadata = {
  schemas: ['Counter'],
  systems: ['counter_system']
};
