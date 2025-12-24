// Test setup: global helpers or mocks can be attached here.
// Keep minimal to avoid importing project modules at setup time.

// Example: expose a no-op global test server handle
if (typeof global !== 'undefined') {
  global.__TEST_SERVER__ = global.__TEST_SERVER__ || null;
  global.__REDIS_CLIENT__ = global.__REDIS_CLIENT__ || null;
}

// Mock app config to avoid loading Fabric or environment-sensitive modules during unit tests
if (typeof jest !== 'undefined' && typeof jest.mock === 'function') {
  jest.mock('../config/index.js', () => ({
    __esModule: true,
    default: {
      server: { env: 'test', port: 4000, apiVersion: 'v1' },
      logging: { level: 'info' },
      websocket: { port: 4001 },
      redis: { host: 'localhost', port: 6379 },
      cors: { origin: () => true, credentials: true },
      rateLimit: { windowMs: 900000, maxRequests: 100 },
    },
  }));
}

// No exports required; this file only sets up globals and must be ESM-safe.
