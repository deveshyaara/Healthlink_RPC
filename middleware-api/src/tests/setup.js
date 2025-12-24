// Test setup: global helpers or mocks can be attached here.
// Keep minimal to avoid importing project modules at setup time.

// Example: expose a no-op global test server handle
if (typeof global !== 'undefined') {
  global.__TEST_SERVER__ = global.__TEST_SERVER__ || null;
  global.__REDIS_CLIENT__ = global.__REDIS_CLIENT__ || null;
}

// No exports required; this file only sets up globals and must be ESM-safe.
