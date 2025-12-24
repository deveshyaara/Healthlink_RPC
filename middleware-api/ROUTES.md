# HealthLink Middleware API — Route Map

This file documents the HTTP endpoints exposed by the middleware API, the HTTP method, a short description, authentication/role requirements, and where the route is mounted.

> Tip: Use `/api/v1/debug/routes` on a running server to get a runtime snapshot of registered routes.

---

## Global (non-versioned) endpoints

| Path | Method | Description | Auth / Role | Notes |
| --- | --- | --- | --- | --- |
| `/health` | GET | Basic health check for the HTTP server | Public | --- |
| `/api/health` | GET | Full API health check (includes Ethereum check) | Public | Runs Ethereum connection check |
| `/api/blockchain/status` | GET | Returns blockchain status (connected, network) | Public | Read-only, used by health UIs |

---

## Auth routes (mounted at `/api/auth`)

| Path | Method | Description | Auth / Role | Notes |
| --- | --- | --- | --- | --- |
| `/api/auth/register` | POST | Register a new user | Public | rate-limited (authLimiter) |
| `/api/auth/login` | POST | Authenticate user and return JWT | Public | rate-limited (authLimiter) |
| `/api/auth/logout` | POST | Logout (server-side cleanup) | Authenticated | `authenticateJWT` |
| `/api/auth/me` | GET | Get current user profile | Authenticated | `authenticateJWT` |
| `/api/auth/refresh` | POST | Refresh JWT token | Authenticated | `authenticateJWT` |
| `/api/auth/change-password` | POST | Change user password | Authenticated | `authenticateJWT` |

---

## Transaction routes (mounted at `/api/v1` — controllers: `transaction.routes.js`)

| Path | Method | Description | Auth / Role | Notes |
| --- | --- | --- | --- | --- |
| `/api/v1/transactions` | POST | Submit a transaction to ledger | Public | Validated by schemas.submitTransaction |
| `/api/v1/transactions/private` | POST | Submit transaction with private/transient data | Public | Validated by schemas.submitPrivateTransaction |
| `/api/v1/query` | POST | Query the ledger (read-only) | Public | Validated by schemas.queryLedger |
| `/api/v1/history/:assetId` | GET | Asset history | Public | Validated params |
| `/api/v1/assets` | GET | Get all assets (paginated) | Public | Uses pagination schema |
| `/api/v1/assets/query` | POST | Rich assets query | Public | Validated by schemas.richQuery |
| `/api/v1/assets` | POST | Create asset | Public | |
| `/api/v1/assets/:assetId` | PUT | Update an asset | Public | |
| `/api/v1/assets/:assetId` | DELETE | Delete an asset | Public | |
| `/api/v1/jobs/:jobId` | GET | Get job status (async transactions) | Public | |

---

## Wallet routes (mounted at `/api/v1/wallet`)

| Path | Method | Description | Auth / Role | Notes |
| --- | --- | --- | --- | --- |
| `/api/v1/wallet/enroll-admin` | POST | Enroll admin user (wallet) | Public | For initial admin enrollment |
| `/api/v1/wallet/register` | POST | Register & enroll a new user wallet | Public | Validated by schemas.registerUser |
| `/api/v1/wallet/identity/:userId` | GET | Get user identity | Public | |
| `/api/v1/wallet/identities` | GET | List identities | Public | |
| `/api/v1/wallet/identity/:userId` | DELETE | Remove identity | Public | |

---

## Storage routes (mounted at `/api/storage`)

| Path | Method | Description | Auth / Role | Notes |
| --- | --- | --- | --- | --- |
| `/api/storage/upload` | POST | Upload a file (medical record) | Authenticated | `authenticateJWT`, Multer upload, 500MB default limit |
| `/api/storage/:hash` | GET | Download/View file by hash | Authenticated | `authenticateJWT` |
| `/api/storage/:hash/metadata` | GET | Fetch file metadata | Authenticated | `authenticateJWT` |
| `/api/storage/admin/stats` | GET | Storage stats | Admin only | `authenticateJWT`, `requireAdmin` |
| `/api/storage/:hash` | DELETE | Delete a file | Admin only | `authenticateJWT`, `requireAdmin` |

---

## Chat (AI agent) routes (mounted at `/api/chat`)

| Path | Method | Description | Auth / Role | Notes |
| --- | --- | --- | --- | --- |
| `/api/chat` | POST | Send message to AI agent | Authenticated | `authenticateJWT` |
| `/api/chat/health` | GET | Check Python agent health | Public | Quick health check for the LangGraph agent |

---

## User management routes (mounted at `/api/users`)

| Path | Method | Description | Auth / Role | Notes |
| --- | --- | --- | --- | --- |
| `/api/users/invite` | POST | Send invitation | Admin only | `authenticateJWT`, `requireAdmin` |
| `/api/users/invitations` | GET | List pending invitations | Admin only | `authenticateJWT`, `requireAdmin` |
| `/api/users/invitations/:token/accept` | POST | Accept invitation | Public | |
| `/api/users/invitations/:id` | DELETE | Cancel invitation | Admin only | `authenticateJWT`, `requireAdmin` |

---

## Admin routes (mounted at `/api/v1/admin`)

| Path | Method | Description | Auth / Role | Notes |
| --- | --- | --- | --- | --- |
| `/api/v1/admin/users/patients` | GET | List all patients (admin) | Admin only | `authenticateJWT`, `requireAdmin` |
| `/api/v1/admin/users/doctors` | GET | List all doctors (admin) | Admin only | `authenticateJWT`, `requireAdmin` |
| `/api/v1/admin/users/pending` | GET | List pending approvals | Admin only | `authenticateJWT`, `requireAdmin` |

---

## Healthcare routes (mounted at `/api/v1/healthcare`) — (core app)

**Patient endpoints**

| Path | Method | Description | Auth / Role | Notes |
| --- | --- | --- | --- | --- |
| `/api/v1/healthcare/patients` | POST | Create a new patient | Protected (Doctor/Admin) | `authenticateJWT`, `requireDoctor` |
| `/api/v1/healthcare/patients/:patientId` | GET | Get patient info | Protected (Patient self or Doctor/Admin) | `authenticateJWT` (permission checks in controller) |
| `/api/v1/healthcare/patients` | GET | Get all patients for a doctor | Protected (Doctor/Admin) | `authenticateJWT`, `requireDoctor` |
| `/api/v1/healthcare/patients/search` | GET | Search patient by email | Protected (Doctor/Admin) | `authenticateJWT`, `requireDoctor` |

**Doctor dashboard**

| Path | Method | Description | Auth / Role | Notes |
| --- | --- | --- | --- | --- |
| `/api/v1/healthcare/doctor/appointments` | GET | Get appointments for a doctor | Protected (Doctor/Admin) | `authenticateJWT`, `requireDoctor` |
| `/api/v1/healthcare/doctor/prescriptions` | GET | Get prescriptions for a doctor | Protected (Doctor/Admin) | `authenticateJWT`, `requireDoctor` |
| `/api/v1/healthcare/doctor/records` | GET | Get records for a doctor | Protected (Doctor/Admin) | `authenticateJWT`, `requireDoctor` |
| `/api/v1/healthcare/doctor/lab-tests` | GET | Get lab tests for a doctor | Protected (Doctor/Admin) | `authenticateJWT`, `requireDoctor` |
| `/api/v1/healthcare/doctor/consents` | GET | Get consent requests for a doctor | Protected (Doctor/Admin) | `authenticateJWT`, `requireDoctor` |

**Records / Consents / Appointments / Prescriptions**

| Path | Method | Description | Auth / Role | Notes |
| --- | --- | --- | --- | --- |
| `/api/v1/healthcare/records` | POST | Create medical record | Protected (Doctor/Admin) | `authenticateJWT`, `requireDoctor` |
| `/api/v1/healthcare/records/:recordId` | GET | Get medical record | Protected | `authenticateJWT` |
| `/api/v1/healthcare/consents` | POST | Create consent (patient grants) | Protected (Patient only) | `authenticateJWT`, `requirePatient` |
| `/api/v1/healthcare/consents` | GET | Get current user's consents | Protected | `authenticateJWT` |
| `/api/v1/healthcare/consents/:consentId` | GET | Get a consent by id | Protected | `authenticateJWT` |
| `/api/v1/healthcare/consents/:consentId/revoke` | PATCH | Revoke consent | Protected | `authenticateJWT` |
| `/api/v1/healthcare/appointments` | POST | Create appointment | Protected (Doctor/Admin) | `authenticateJWT`, `requireDoctor` |
| `/api/v1/healthcare/appointments` | GET | Get current user's appointments | Protected | `authenticateJWT` |
| `/api/v1/healthcare/appointments/:appointmentId` | GET | Get appointment | Protected | `authenticateJWT` |
| `/api/v1/healthcare/appointments/:appointmentId` | PUT | Update appointment | Protected | `authenticateJWT` |
| `/api/v1/healthcare/appointments/:appointmentId/cancel` | POST | Cancel an appointment | Protected | `authenticateJWT` |
| `/api/v1/healthcare/prescriptions` | GET | Get current user's prescriptions | Protected | `authenticateJWT` |
| `/api/v1/healthcare/prescriptions` | POST | Create a prescription | Protected (Doctor/Admin) | `authenticateJWT`, `requireDoctor` |
| `/api/v1/healthcare/prescriptions/:prescriptionId` | GET | Get prescription | Protected | `authenticateJWT` |
| `/api/v1/healthcare/prescriptions/:prescriptionId` | PUT | Update prescription | Protected | `authenticateJWT` |

**Audit**

| Path | Method | Description | Auth / Role | Notes |
| --- | --- | --- | --- | --- |
| `/api/v1/healthcare/audit` | GET | Get audit records | **Admin only** | **FIXED**: Now protected by `authenticateJWT` + `requireAdmin` |

**Convenience aliases (mounted in server root)**

| Path | Method | Description | Notes |
| --- | --- | --- | --- |
| `/api/medical-records` | GET/POST | Alias to healthcare records endpoints (older frontend compatibility) | Maps into same handlers as `/api/v1/healthcare/records` or `getCurrentUserRecords` |
| `/api/appointments` | GET/POST | Alias endpoints for appointment listing/creation | Mounted explicitly in `server.js` |
| `/api/prescriptions` | GET/POST | Alias endpoints for prescriptions listing/creation | Mounted explicitly in `server.js` |

---

## Helpful runtime/debug endpoints

- `/api/v1/debug/routes` — list registered routes (useful to confirm runtime route registration) 
- `/api/v1` — API documentation and high-level listing (server returns endpoints summary)

---

## Notes & Recommendations

- Prefer using the versioned endpoints under `/api/v1/healthcare` for frontend integrations.
- Use the debug route `/api/v1/debug/routes` to confirm what is registered on a running server instance (this is especially useful if handlers are conditionally registered).
- Many endpoints are protected with JWT tokens; generate a JWT via the `/api/auth/login` flow or use a manually signed token with a dev JWT_SECRET for testing.
- When adding new routes, please update this `ROUTES.md` file to keep the documentation in sync.

---

## Issues found & fixes applied

- **Ambiguous record route removed** — previously a root-level `/:recordId` route captured `/patients` and caused 404s; the route was removed and replaced by explicit `/records/:recordId` (see `src/routes/healthcare.routes.js`). ✅
- **Audit route unprotected** — `/api/v1/healthcare/audit` was previously unprotected; it is now protected with `authenticateJWT` + `requireAdmin` to prevent unauthorized access to audit logs. ✅
- **Appointment handlers were stubs** — `updateAppointment` and `cancelAppointment` have been implemented with permission checks, DB persistence, on-chain updates (via `transactionService`) and **audit logging**. Key details:
  - Patients can only update `notes` on their own appointments (403 otherwise).
  - Doctors/Admins can update status, notes, reschedule, and other fields.
  - Updates persist to DB when Prisma is available and attempt on-chain calls; failures are non-fatal for DB operations.
  - Audit events are logged via `dbService.logAuditEvent(userId, action, metadata)` for compliance (appointment.updated, appointment.cancelled).

---

## New tests added

- Unit tests: `src/tests/appointments.test.js` — covers permission checks, on-chain call invocation, and audit logging call.
- Integration tests (conditional): `src/tests/integration/appointments.integration.test.js` — exercises the full DB+controller flow and verifies audit rows are created. These tests are skipped unless `INTEGRATION_DATABASE_URL` environment variable is set to a test PostgreSQL instance. ⚠️ Ensure the test DB has the Prisma schema applied before running.
- Frontend E2E (Playwright): `frontend/tests/e2e/appointments.spec.ts` — skeleton that tests the doctor update flow in the UI; requires `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_TEST_USER`, and `PLAYWRIGHT_TEST_PASS` to run.

---

## Deployment / Staging smoke test

- Added `middleware-api/scripts/smoke-test-staging.sh` which checks blockchain status and protected endpoints on a staging URL (`STAGING_URL` env var) and can call authenticated endpoints when `STAGING_JWT` is provided.

---

_End of file._

---

_End of file._
