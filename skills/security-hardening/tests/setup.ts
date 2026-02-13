/**
 * Jest test setup
 */

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep error and warn for debugging
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
