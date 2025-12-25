## Summary

This PR adds support for revoking consents on-chain and improves error handling and testing across the frontend.

### Highlights
- New feature: `revokeConsent` in `frontend/src/services/ethereum.service.ts` and exposed via `useHealthcare` hook.
- Refactor: `extractErrorMessage` moved into `frontend/src/hooks/error-utils.ts` for consistent error normalization.
- Tests: `frontend/src/hooks/useHealthcare.runtime.test.tsx` added (runtime tests using React Testing Library and Vitest), plus a small unit test `useHealthcare.test.ts`.
- UI: patient creation and `DoctorActions` now surface `blockchainError` fields returned from backend.
- Dev deps: added `vitest`, `@testing-library/react`, and `jsdom` for fast, deterministic tests.

## Testing
- All Vitest runtime tests pass locally (10/10). See `src/hooks/useHealthcare.runtime.test.tsx`.

## Checklist
- [x] Implemented `revokeConsent` and hooked it into the frontend hook return values
- [x] Decoupled error extraction to `error-utils.ts`
- [x] Added runtime tests for patient/appointment/consent flows
- [x] Updated `CHANGELOG.md` with Unreleased section
- [x] Added `test:unit` script and installed required dev dependencies

## Notes
- After merge: follow-up task to add UI/Toast verification tests (Playwright or component tests mocking the toast provider).

