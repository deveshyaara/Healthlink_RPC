import { jest } from '@jest/globals';

let optionalAuth;

beforeAll(async () => {
  // Use ESM-friendly unstable_mockModule to mock config before importing modules
  if (typeof jest !== 'undefined' && typeof jest.unstable_mockModule === 'function') {
    await jest.unstable_mockModule('../config/index.js', () => ({
      __esModule: true,
      default: {
        server: { env: 'test', port: 4000, apiVersion: 'v1' },
        logging: { level: 'info' },
      },
    }));
  }

  const mod = await import('../middleware/auth.middleware.js');
  optionalAuth = mod.optionalAuth;
});

describe('optionalAuth middleware', () => {
  test('injects minimal user when X-User-ID header is present and no Authorization', async () => {
    const req = { headers: { 'x-user-id': 'test-user' } };
    const res = {};
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe('test-user');
    expect(next).toHaveBeenCalled();
  });

  test('sets req.user to null when no auth and no header', async () => {
    const req = { headers: {} };
    const res = {};
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
  });
});