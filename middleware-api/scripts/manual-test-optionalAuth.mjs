import { optionalAuth } from '../src/middleware/auth.middleware.js';

async function run() {
  let req = { headers: { 'x-user-id': 'manual-test-user' } };
  let res = {};
  let nextCalled = false;
  await optionalAuth(req, res, () => { nextCalled = true; });
  console.log('Header present => req.user.userId:', req.user?.userId, 'nextCalled:', nextCalled);

  req = { headers: {} };
  nextCalled = false;
  await optionalAuth(req, res, () => { nextCalled = true; });
  console.log('No header => req.user:', req.user, 'nextCalled:', nextCalled);
}

run().catch((e) => { console.error('Error running manual test:', e); process.exit(1); });