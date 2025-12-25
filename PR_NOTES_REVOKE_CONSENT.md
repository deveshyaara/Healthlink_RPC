PR Title: feat(revoke-consent): add revokeConsent + error-utils + runtime tests

Branch: feat/revoke-consent-tests

Description:
This PR implements the following:
- Adds `revokeConsent(consentId)` to `frontend/src/services/ethereum.service.ts` and exposes it via the `useHealthcare` hook.
- Refactors error normalization by adding `frontend/src/hooks/error-utils.ts` and using it in `useHealthcare` to ensure consistent messages across the UI.
- Adds runtime tests `src/hooks/useHealthcare.runtime.test.tsx` and a unit test `src/hooks/useHealthcare.test.ts` covering:
  - createPatient (loading, success, generic error, blockchain error)
  - createAppointment (loading, success with correct args, error)
  - createConsent (success, wallet rejection)
  - revokeConsent (success, rejection/revert messages)
- Updates UI to surface `blockchainError` returned by backend during patient creation and appointment scheduling.
- Adds `vitest`, `@testing-library/react`, and `jsdom` as dev dependencies and a `test:unit` script in `frontend/package.json`.

Testing:
- All vitest tests pass locally: 10/10 passing (runtime and unit tests).

Files changed (high level):
- frontend/src/services/ethereum.service.ts (+revokeConsent)
- frontend/src/hooks/error-utils.ts (new)
- frontend/src/hooks/useHealthcare.ts (+revokeConsent, uses error-utils)
- frontend/src/hooks/useHealthcare.runtime.test.tsx (new)
- frontend/src/hooks/useHealthcare.test.ts (new)
- frontend/src/components/doctor/DoctorActions.tsx (show blockchainError toast)
- frontend/src/app/api/patients/create/route.ts (include blockchainError in JSON response)
- frontend/package.json (dev deps & script), frontend/package-lock.json
- CHANGELOG.md (Unreleased entry)
- .github/PULL_REQUEST_TEMPLATE.md (PR template)

Notes:
- PR is currently on branch `feat/revoke-consent-tests`. To open the PR in GitHub, visit:
  https://github.com/deveshyaara/Healthlink_RPC/pull/new/feat/revoke-consent-tests

Follow-up:
- Add UI toasts/Playwright tests to assert toasts are shown when `blockchainError` is returned (planned as follow-up after this PR merges).
