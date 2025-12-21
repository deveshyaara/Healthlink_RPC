Smoke test runner

Usage:

```
node run.js --baseUrl=http://localhost:3001
```

This script will attempt to register/login a temporary user, upload a small file, create a medical record, and exercise prescriptions/appointments endpoints.

Notes:
- Ensure the backend is running at the provided `--baseUrl` before running.
- The script uses the global `fetch`/`FormData` APIs available in modern Node.js (v18+). If you run an older Node version, upgrade first.
