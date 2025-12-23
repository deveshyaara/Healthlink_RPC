#!/usr/bin/env node

// Lightweight JWT generator for local testing
(async () => {
  try {
    const jwtModule = await import('jsonwebtoken');
    const jwt = jwtModule.default || jwtModule;

    const userId = process.argv[2] || 'test-doctor';
    const role = process.argv[3] || 'doctor';
    const email = process.argv[4] || `${userId}@healthlink.local`;

    // Prefer environment variable, but fall back to reading the local .env file used by the running server
    let JWT_SECRET = process.env.JWT_SECRET || null;
    if (!JWT_SECRET) {
      try {
        const fs = await import('fs');
        const dotenvPath = new URL('../.env', import.meta.url).pathname.replace(/^\//, '');
        if (fs.existsSync(dotenvPath)) {
          const content = fs.readFileSync(dotenvPath, 'utf8');
          const match = content.match(/^JWT_SECRET=(.+)$/m);
          if (match) JWT_SECRET = match[1].trim();
        }
      } catch (e) {
        // ignore and use default below
      }
    }

    JWT_SECRET = JWT_SECRET || 'healthlink-secret-key-change-in-production';
    const expiresIn = process.env.JWT_EXPIRY || '24h';

    const payload = {
      userId,
      email,
      role,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn });
    console.log(token);
  } catch (err) {
    console.error('Failed to generate token:', err.message || err);
    process.exit(1);
  }
})();
