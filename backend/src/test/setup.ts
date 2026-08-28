import { vi, afterAll } from 'vitest';

// Global test setup for backend
// Extend default timeout for database operations
vi.setConfig({ testTimeout: 10000 });

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
global.console = {
  ...originalConsole,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: originalConsole.warn.bind(originalConsole),
  error: originalConsole.error.bind(originalConsole),
};

// Clean up after all tests
afterAll(() => {
  global.console = originalConsole;
});
