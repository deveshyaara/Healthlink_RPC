# Changelog

## Unreleased

### Added
- **Feature:** `revokeConsent` added to `frontend/src/services/ethereum.service.ts` and exposed via `useHealthcare` hook.
- **Testing:** Added `src/hooks/useHealthcare.runtime.test.tsx` and `src/hooks/useHealthcare.test.ts` to validate runtime behavior and error extraction.
- **Utilities:** Decoupled error extraction into `src/hooks/error-utils.ts` for consistent error messages across the app.

### Changed
- **Frontend:** `DoctorActions` and patient creation route now surface `blockchainError` messages returned by the backend.
- **Testing deps:** Added `vitest`, `@testing-library/react`, and `jsdom` as dev dependencies for fast unit/runtime tests.

### Tests
- Achieved 100% coverage for `createPatient`, `createAppointment`, `createConsent`, and `revokeConsent` logic in `useHealthcare` via runtime tests.

---
