# Client Package Tests

This directory contains all tests for the `@0xobelisk/client` package.

## Structure

```
tests/
├── __mocks__/          # Mock implementations
│   ├── dubhe-mocks.ts  # Mocks for Dubhe dependencies
│   └── metadata.mock.ts # Mock metadata
├── utils/              # Test utilities
│   └── test-helpers.ts # Helper functions for tests
├── setup.ts            # Global test setup
└── README.md           # This file

src/
└── sui/
    ├── client.ts       # Source code
    └── client.test.ts  # Tests co-located with source
```

## Running Tests

### Run all tests

```bash
pnpm test
```

### Run tests in watch mode

```bash
pnpm test:watch
```

### Run tests with UI

```bash
pnpm test:ui
```

### Generate coverage report

```bash
pnpm test:coverage
```

## Writing Tests

### Test Structure

Tests are written using Vitest. Here's a basic example:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from './client';

describe('createClient', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  it('should create client successfully', () => {
    const config = {
      network: 'devnet',
      packageId: '0x123',
      metadata: mockMetadata
    };

    const client = createClient(config);

    expect(client).toBeDefined();
    expect(client.network).toBe('devnet');
  });
});
```

### Using Mocks

Import mock implementations from the `__mocks__` directory:

```typescript
import { mockDubheClient, mockGraphqlClient } from '@tests/__mocks__/dubhe-mocks';
import { mockMetadata } from '@tests/__mocks__/metadata.mock';
```

### Using Test Helpers

Import helper functions from `utils/test-helpers.ts`:

```typescript
import { createMockConfig, wait, assertDefined } from '@tests/utils/test-helpers';

// Create a mock config
const config = createMockConfig({
  network: 'mainnet'
});

// Wait for async operations
await wait(100);

// Assert that a value is defined
assertDefined(client.address);
```

## Test Coverage

We aim for at least 80% coverage across all metrics:

- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

Coverage reports are generated in the `coverage/` directory after running `pnpm test:coverage`.

## Best Practices

1. **Co-locate tests with source code**: Place `.test.ts` files next to the source files they test
2. **Use descriptive test names**: Clearly describe what the test is verifying
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Mock external dependencies**: Use `vi.mock()` to mock external modules
5. **Clean up after tests**: Use `afterEach` or `afterAll` to clean up state
6. **Test edge cases**: Don't just test the happy path
7. **Use type safety**: Leverage TypeScript for better test reliability

## Debugging Tests

### Debug a specific test

```bash
pnpm test -- --reporter=verbose src/sui/client.test.ts
```

### Debug with console output

Comment out console mocks in `tests/setup.ts` to see console output during tests.

### Use Vitest UI for debugging

```bash
pnpm test:ui
```

This opens a browser-based UI where you can see test results, coverage, and debug individual tests.

## CI/CD Integration

Tests are automatically run in CI/CD pipelines. Make sure all tests pass before submitting a PR.

```bash
# Run the full validation suite
pnpm validate
```

This runs formatting checks, type checking, and tests.
