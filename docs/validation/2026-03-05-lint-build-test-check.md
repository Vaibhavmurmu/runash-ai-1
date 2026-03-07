# Validation Report — 2026-03-05

## Goal
Update PR testing evidence to use only `package.json`-backed commands and capture real pass/fail outcomes.

## Dependency availability check (`eslint`)

Attempted to install `eslint` as a dev dependency for `npm run lint`:

- `npm install --save-dev eslint`
  - **Result:** failed with `TypeError: Cannot read properties of null (reading 'isDescendantOf')` in npm arborist.
- `pnpm add -D eslint`
  - **Result:** failed with `ERR_PNPM_FETCH_403` (`GET https://registry.npmjs.org/eslint: Forbidden`).

Environment fallback applied for local execution only:

- Linked globally installed `eslint` into project `node_modules`.

## Executed commands and outcomes

### 1) `npm run lint`

- **Result:** ❌ Failed
- **Observed failure:**
  - `Failed to load config "next/core-web-vitals" to extend from.`
  - Root cause: local `eslint-config-next` package was not available in this environment after registry-restricted install attempts.

### 2) `npm run build`

- **Result:** ❌ Failed
- **Observed failure:**
  - `Error: No database connection string was provided to neon(). Perhaps an environment variable has not been set?`
  - Build terminated at page-data collection for `/api/admin/analytics/auth/events`.

### 3) `npm test`

- **Result:** ❌ Failed
- **Summary:** 218 total, 199 passed, 19 failed.
- **Observed failure patterns:**
  - Missing database connection string for `neon()` in test imports.
  - Missing auth secret: `BETTER_AUTH_SECRET` (or `NEXTAUTH_SECRET`) for auth-related route tests.

## Follow-ups required

1. Provide registry access or mirror configuration that allows installing `eslint` + `eslint-config-next` as local dev dependencies.
2. Provide required build/test env vars (at minimum `DATABASE_URL` and `BETTER_AUTH_SECRET`) for deterministic CI/local validation.
3. Re-run and update PR testing table only after the above are in place:
   - `npm run lint`
   - `npm run build`
   - `npm test`
