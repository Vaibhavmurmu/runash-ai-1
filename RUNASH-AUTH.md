# RunAsh Auth Implementation Status

Last updated: 2026-02


## Middleware/admin authorization hardening update (2026-02)

- Middleware public API matching now allowlists only explicit unauthenticated auth endpoints instead of treating the full `/api/auth/**` tree as public.
- Privileged auth endpoints such as `GET /api/auth/claims` and `GET /api/auth/permissions` now stay behind authenticated session validation at middleware boundary.
- `requireAdminAuthorization` now enforces an explicit admin-capable role gate (`admin`/`super_admin`) before permission evaluation, preserving response contracts (`401` unauthenticated, `403` unauthorized).
- No payment request/response contracts or field names were changed by this hardening pass.

## Admin auth/org operations update (2026-02)

- Added an admin auth/org route inventory with UI coverage mapping at `docs/ADMIN_AUTH_ORG_ROUTE_INVENTORY.md`.
- Added a dedicated incident + rollback runbook for privileged org/provider/tenant-user changes at `docs/AUTH_ORG_INCIDENT_RUNBOOK.md`.
- Admin organization lifecycle, provider mapping, and tenant-scoped user operations now require privileged authorization and write to admin audit logs for traceability.

## Security hardening update (2026-02)

- OAuth account linking now enforces verified identity linking by default at runtime (no permissive fallback toggle).
- Sensitive account actions (password change, API key rotation, and session revoke-all) now trigger session invalidation and session cookie revocation to force secure re-authentication.
- Auth/admin-sensitive APIs are protected with stricter endpoint-specific rate limits in addition to baseline API rate controls.
- Auth event logging now redacts credentials/tokens/secrets and stores anonymized session identifiers for audit safety.


## Stream session API authorization hardening update (2026-02)

- Added server-session authentication gates (`getServerAuthSession`) to stream session start/end/recordings routes under `app/api/streams/sessions/[id]/**`.
- Added tenant ownership checks so only the stream owner can start/end a session or read/create recordings. Unauthorized requests now return consistent auth envelopes with `401` (unauthenticated), `403` (cross-tenant forbidden), and `404` (session missing).
- Added non-sensitive audit logging for `streams.sessions.start`, `streams.sessions.end`, and `streams.sessions.recordings.{read|create}` events with request/user/session identifiers only (no credentials/tokens/keys).
- Added regression tests for unauthorized and cross-tenant access attempts in `app/api/streams/sessions/route-authz.test.ts`.

## Better Auth storage migration update (2026-02)

- `db/migrations/0000_auth_neon_better_auth_baseline.sql` now ships executable DDL (not placeholder text) for Better Auth core tables: `accounts`, `sessions`, and `verification_tokens`, while aligning profile fields on the existing `users` table.
- The same baseline migration now provisions RunAsh session-mode tables used by `/api/auth/sessions/**`: `auth_session_identities`, `auth_session_registry`, and `auth_one_time_transfer_tokens`.
- Migration remains idempotent (`IF NOT EXISTS` guards + additive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) to support rolling deploys and repeated CI bootstrap runs.

### Migration notes (Better Auth + session registry baseline)

1. Apply migration: `db/migrations/0000_auth_neon_better_auth_baseline.sql`.
2. Verify table creation: `accounts`, `sessions`, `verification_tokens`, `auth_session_identities`, `auth_session_registry`, `auth_one_time_transfer_tokens`.
3. Validate runtime endpoints after migration:
   - `GET /api/auth/sessions` (list)
   - `DELETE /api/auth/sessions` (single/all revoke)
   - `POST /api/auth/sessions/switch` (scope switch)
4. Backward-compatibility guarantees:
   - Existing `users` table + field names are preserved.
   - API signatures for session list/switch/revoke are unchanged.

### Rollback guidance (schema + runtime)

- **Preferred rollback:** application-level rollback first (redeploy previous stable app artifact) because this migration is additive and does not drop/rename existing auth columns.
- **If DB rollback is required:**
  1. Disable new session-mode writes (temporary feature/config gate) so no new rows are introduced.
  2. Revert app to the previous release and monitor auth/session error rates.
  3. Drop only newly created tables if the previous release cannot tolerate them:
     - `auth_one_time_transfer_tokens`
     - `auth_session_registry`
     - `auth_session_identities`
     - `verification_tokens`
     - `sessions`
     - `accounts`
- **Do not rollback by removing `users` auth profile columns** (`email_verified`, `image`, `name`, `created_at`, `updated_at`) unless a dedicated data-migration plan is approved, because other runtime paths may already depend on them.

## Unified register backend flow update (2026-02)

- `POST /api/auth/register` now delegates account creation to `auth.api.signUpEmail` from `lib/auth.ts`, making Better Auth the registration source of truth.
- Legacy response fields (`message`, `user`) are preserved via compatibility mapping for existing frontend callers.
- Signup entrypoints (`app/get-started/page.tsx`, `components/auth/register-form.tsx`, and `components/auth/better-sign-up-card.tsx`) now converge on `/api/auth/register`.

## Better Auth canonical signup/session path update (2026-02)

- Better Auth email/password remains the canonical signup provider in `lib/auth.ts` with explicit verification-required behavior (`requireEmailVerification=true`, verification email dispatch on signup, and no auto sign-in before/after verification).
- `POST /api/auth/register` continues to call Better Auth server-side (`auth.api.signUpEmail`) and now determines verification-required messaging directly from Better Auth user verification state while preserving legacy response fields (`message`, `user`).
- Signup UI entrypoints (`app/get-started/page.tsx`, `components/auth/register-form.tsx`, `components/auth/better-sign-up-card.tsx`) remain unified through `registerWithUnifiedRoute` -> `/api/auth/register`.
- Protected API session reads remain centralized through `getAuthSessionFromHeaders` / `getServerAuthSession` from `lib/auth.ts` (via direct import or `lib/auth/session` compatibility wrapper).

## Email verification delivery hardening update (2026-02)

- Better Auth email verification callbacks now normalize all verification links to the canonical endpoint (`/api/auth/verify-email`) before dispatch.
- Verification emails now route through the safety-aware `lib/email.ts` utility so allowlist/sink/dry-run controls and provider safeguards are consistently applied.
- Signup UI copy explicitly states that email/password accounts require verification before first login to reduce onboarding ambiguity.

## Email verification flow consistency update (2026-02)

- Better Auth remains the single source of truth for email verification token generation and verification (`auth.api.sendVerificationEmail` + `auth.api.verifyEmail`) with `/api/auth/verify-email` retained as the canonical verifier endpoint.
- Shared callback URL resolution now lives in `lib/auth.ts` (`emailVerificationCallbackURL`) so signup, resend verification, and verification redirects use the same post-verification destination contract.
- `POST /api/auth/resend-verification` now uses centralized auth rate-limit policy (`AUTH_ENDPOINT_RATE_LIMITS["resend-verification"]`) and always returns the same non-enumerating response message for unknown or already-verified emails.
- `GET /verify-email?token=...` now follows the same canonical token path by calling `GET /api/auth/verify-email` and exposing resend UX for known emails without introducing alternate verification token semantics.
- Resend verification delivery continues through Better Auth's verification callback path (which is wired to the Resend-backed email provider abstraction in `lib/email.ts`) and now normalizes callback URL handling through shared auth email URL utilities.
- Signup UI now surfaces an in-flow verification notice (`"Check your email to verify your account"`) when verification is required, instead of immediately navigating away as if account access was active.

## Get-started onboarding flow update (2026-02)

- Restored the three-step onboarding journey (`Account -> Profile -> Complete`) inside a dark themed get-started modal while preserving the rich landing hero CTA flow.
- Step 1 now bundles OAuth buttons (Google/GitHub plus optional Apple/Microsoft entry actions), email/password signup, and advanced auth methods (Magic Link, OTP, Passkey, SSO) using existing components from `components/auth/*`.
- Role selection persistence remains keyed by `runash_user_type` in local storage, and completion exposes explicit navigation targets to `/consent` and `/post-login`.
- Added upload-screenshot-ready onboarding messaging in the get-started modal so post-login flows are clearly communicated.

This document tracks the **currently implemented** auth runtime, files, and routes in this repository. It intentionally excludes speculative endpoints that are not present in source.

Cross-links: `SECURITY.md`, `PLATFORM_GUIDE.md`, `docs/DOC_GOVERNANCE.md`.

## Auth email provider unification update (2026-02)

- Introduced one canonical provider module at `lib/email-provider.ts` used by both transactional auth mail (`lib/email.ts`) and report mail (`lib/emails.ts`).
- Provider selection is now deterministic via `EMAIL_PROVIDER=smtp|resend` with explicit fallback behavior:
  - `EMAIL_PROVIDER=smtp` -> use SMTP when configured, otherwise fallback to Resend if available.
  - `EMAIL_PROVIDER=resend` -> use Resend when configured, otherwise fallback to SMTP if available.
  - unset/invalid `EMAIL_PROVIDER` -> auto-select SMTP first, then Resend.
- Standardized environment variables on `SMTP_PASSWORD` (canonical) and `EMAIL_FROM` (canonical sender). Legacy aliases `SMTP_PASS` and `SMTP_FROM` remain temporary compatibility fallbacks for migration safety.
- Resend transport now uses the official SDK client initialization path (`new Resend(process.env.RESEND_API_KEY)`) and sends with explicit `{ data, error }` handling plus bounded retry for rate-limit/transient failures (HTTP `429`, `5xx`, `408`, `425`).
- Resend send options support optional `replyTo`, `scheduledAt`, `tags`, `attachments`, and `idempotencyKey` fields via the canonical provider abstraction.
- Existing auth send paths continue through `sendVerificationEmail` and `sendPasswordResetEmail`, but the final transport now resolves through the canonical provider path and keeps delivery tracking + realtime status events unchanged.

### Required email environment variables

- Shared:
  - `EMAIL_PROVIDER` (`smtp` or `resend`)
  - `EMAIL_FROM` (recommended canonical sender, for both providers)
- Resend-specific sender domain control:
  - `RESEND_VERIFIED_FROM` (recommended; verified production sending identity/domain, used before `EMAIL_FROM`)
- SMTP path:
  - `SMTP_HOST`
  - `SMTP_PORT` (optional, defaults `587`)
  - `SMTP_USER`
  - `SMTP_PASSWORD`
  - `SMTP_SECURE` (optional, `true|false`)
- Resend path:
  - `RESEND_API_KEY`

### Required auth database environment matrix

| Priority | Environment variable | Required | Notes |
|---|---|---|---|
| 1 | `DATABASE_URL` | Recommended | Canonical auth/runtime DB URL. |
| 2 | `NEON_DATABASE_URL` | Fallback | Used when `DATABASE_URL` is not set. |
| 3 | `POSTGRES_URL` | Fallback | Platform-provided pooled Postgres URL. |
| 4 | `POSTGRES_PRISMA_URL` | Fallback | Prisma-compatible pooled URL fallback. |
| 5 | `POSTGRES_URL_NON_POOLING` | Fallback | Direct/non-pooled connection fallback. |
| 6 | `runash_POSTGRES_URL` | Fallback | Legacy project-prefixed pooled URL. |
| 7 | `runash_POSTGRES_URL_NON_POOLING` | Fallback | Legacy project-prefixed non-pooled URL. |

**Resolution precedence:** `DATABASE_URL -> NEON_DATABASE_URL -> POSTGRES_URL -> POSTGRES_PRISMA_URL -> POSTGRES_URL_NON_POOLING -> runash_POSTGRES_URL -> runash_POSTGRES_URL_NON_POOLING`.

**Runtime guard behavior:** auth/OTP/SSO modules now resolve DB connectivity only through `lib/db.ts`. If no DB URL env is configured, startup/runtime paths throw an actionable error that lists supported env names, precedence order, and an example value format.

### Migration notes

1. Replace `SMTP_PASS` with `SMTP_PASSWORD` in deployment secrets.
2. Replace `SMTP_FROM` with `EMAIL_FROM` in deployment secrets.
3. Set `EMAIL_PROVIDER` explicitly per environment to avoid accidental provider switching.
4. Keep legacy aliases only during rollout; remove after secret sync verification.

## AI agents dashboard session-scoping update (2026-02)

- AI agent dashboard now relies on active auth session identity and no longer uses a mock user identifier in client state.
- Agent API client requests no longer submit mutable `userId` query/body values for self-service flows; user scope is resolved from server session.
- AI agent create/update/delete routes reject requests attempting to override `user_id` and remain constrained to the authenticated session user unless elevated admin authorization applies.

## Dashboard model dialog auth/session update (2026-02)

- `POST /api/dashboard/model-dialog` now enforces authenticated dashboard session resolution on the server and rejects unauthenticated calls before model execution.
- Model dialog requests are zod-validated (`modelId`, `mode`, `input`, optional `sourceModule/context`) and return a normalized envelope `{ requestId, status, output, error }`.
- Model dialog runs are persisted in `model_dialog_runs` and exposed through `GET /api/dashboard/model-dialog/recent`, so recent run history survives dashboard refresh/navigation while remaining scoped to the authenticated user.

## Tenant-aware user/account query guard update (2026-02)

- Added a tenant guard utility in `lib/api/route-auth.ts` that resolves `organizationId` from authenticated session (`ssoOrganization`) and produces SQL predicates for tenantized tables.
- User/account mutable routes now enforce tenant boundary predicates against `users.sso_organization_id` in addition to user-id checks (including `app/api/users/[id]/profile` and `app/api/auth/account`).
- Compatibility mode is enabled for migration safety: when a session has an organization, predicates allow rows with `NULL` organization (`organization_id IS NULL` equivalent for this schema) to preserve access to legacy records during backfill.

### Tenant migration compatibility + rollback notes

1. **Backfill window:** keep guard compatibility mode (`org = sessionOrg OR org IS NULL`) while tenant backfill migrates legacy null-org rows.
2. **Cutover:** once null-org user/account rows are backfilled, switch to strict tenant mode (`org = sessionOrg`) by disabling legacy-null fallback in guard call-sites.
3. **Rollback:** if tenant backfill causes access regressions, temporarily restore compatibility mode and re-run targeted backfill/verification before re-enabling strict mode.
4. **Safety constraints:** do not broaden predicates beyond same-session tenant scope; do not log tenant/auth identifiers beyond existing redaction policy.

## OpenAPI + Scalar auth docs update (2026-02)

- Added generated OpenAPI spec output for auth routes at `docs/openapi/auth.openapi.json`.
- Added served OpenAPI endpoint at `GET /api/auth/openapi` and interactive Scalar docs at `GET /api/auth/docs` and `/docs/auth-api`.
- OpenAPI includes core auth routes plus enabled plugin endpoints (OTP, SIWE, SCIM, SSO, device flow, bearer sessions, and OTT), with explicit auth requirements and example payloads for key plugin contracts.
- Added CI guard to regenerate and diff-check `docs/openapi/auth.openapi.json` to keep docs in sync with route contract changes.

## 1) Runtime and source-of-truth files

## 2026-02 auth/payment validation note (no auth contract changes)

- **Change type:** validation-only run and policy documentation refresh; no auth endpoint additions/removals and no request/response contract changes.
- **Impacted auth/payment flows reviewed:**
  - Session validation (`GET /api/auth/get-session`) used by protected payment surfaces
  - Login/session continuity behavior for payment-linked routes
  - Authorization guard posture (`401` unauthenticated, `403` unauthorized) on payment/auth-adjacent pages
- **Risk assessment:** low behavior risk; primary execution risk remains environment-dependent build failures when required database configuration is missing.
- **Rollback plan:** revert documentation-only commit; no runtime rollback or credential/session migration is required.

## 2026-02-28 auth/payment validation execution note

- **Behavior change summary:** no auth runtime/contract changes were introduced.
- **Validation command outcomes captured for release auditability:**
  - `npm run lint` failed in this environment because `eslint` is not installed.
  - `npm run build` reached successful compilation but failed during page-data collection due to missing database env (`No database connection string was provided to neon()`).
- **Impacted auth/payment flows reviewed:**
  - Session retrieval/validation path (`GET /api/auth/get-session`) that protects payment-adjacent routes.
  - Authenticated access continuity assumptions for billing/credits entrypoints.
  - Authorization guard posture (`401` unauthenticated, `403` unauthorized) for auth/payment-adjacent surfaces.
- **Risk + rollback:** risk is environment/dependency readiness for validation pipelines; rollback remains docs-only revert with no auth schema or session migration changes.


## 2026-02-28 auth/payment validation rerun (release checklist)

- **Behavior change summary:** none; this rerun only records validation evidence for release auditability.
- **Validation command outcomes (latest run):**
  - `npm run lint` failed because the environment is missing `eslint` (`next lint` reported `ESLint must be installed`).
  - `npm run build` compiled successfully, then failed during page-data collection because Neon database configuration is unset (`No database connection string was provided to neon()`).
- **Impacted auth/payment flows reviewed:**
  - Auth session retrieval guard (`GET /api/auth/get-session`) used by payment-adjacent routes.
  - Authenticated continuity assumptions across billing/credits entrypoints.
  - Authorization posture (`401` unauthenticated, `403` unauthorized) for auth/payment-adjacent surfaces.
- **Risks:** validation confidence is gated by local dependency/env readiness (`eslint` package and DB connection string).
- **Rollback steps:** documentation-only rollback by reverting this commit; no API/schema/session migration rollback is required.

### Better Auth runtime and adapters
- `lib/auth.ts` — Better Auth instance, provider config, account-linking hooks, and the canonical server-side session resolver (`getAuthSessionFromHeaders`, `getServerAuthSession`).
- `app/api/auth/[...nextauth]/route.ts` — Next.js route handler mounted via `toNextJsHandler(auth)`.
- `lib/auth/session-accessor.ts` and `lib/auth/session.ts` — compatibility wrappers that now delegate to `lib/auth.ts` during migration.
- `lib/auth/session-accessor-handler.ts` — lifecycle validation + legacy fallback orchestration used by the auth module.
- `lib/auth-helpers.ts` — app-facing auth helper bridge (`getSession`, `requireAuth`, `getCurrentUser`).

### Middleware and guard rails
- `middleware.ts` — public/protected route checks, `/login` redirect behavior, auth endpoint rate limiting, and server-side validation via `/api/auth/get-session`.
- `lib/auth-middleware.ts` — admin/API guard helpers for permissioned routes.
- `lib/auth-security-config.ts` — auth endpoint rate-limit profiles.

### Identity, RBAC, and observability
- `lib/rbac.ts` — role catalog and route-to-permission policy mapping.
- `lib/auth-observability.ts` and `lib/auth-analytics.ts` — auth metrics/audit instrumentation.
- `lib/auth-logger.ts` — auth-safe logging utilities.

## 1.1) Final auth architecture snapshot (implemented vs planned)

### Implemented (finalized 2026-02)

```text
Client/UI
  -> middleware.ts
     -> GET /api/auth/get-session
        -> lib/auth/session-accessor*.ts
           -> lib/auth.ts (Better Auth runtime + secrets)
              -> RBAC checks via lib/auth-middleware.ts + lib/rbac.ts
                 -> Protected API/UI handlers
                    -> Sanitized audit + auth telemetry
```

- Canonical auth runtime and secret resolution are centralized in `lib/auth.ts`.
- Auth route handling is mounted through `app/api/auth/[...nextauth]/route.ts`.
- Server-side authorization enforces route+method RBAC with deny-by-default behavior (`401`/`403`).
- Sensitive auth/admin events are logged with redacted metadata only.

### Planned (post-baseline, non-blocking)

- Keep `db/migrations/0000_auth_neon_better_auth_baseline.sql` immutable post-release and introduce additive follow-up migrations for any auth table evolution.
- Retire legacy NextAuth compatibility fallback after rollout stability windows complete.

## 2) Implemented auth routes (API)

Only routes currently present under `app/api/auth/**` are listed below (verified against repository route files).

| Route | File |
|---|---|
| `GET/POST /api/auth/[...nextauth]` | `app/api/auth/[...nextauth]/route.ts` |
| `POST /api/auth/sign-in` | `app/api/auth/sign-in/route.ts` |
| `POST /api/auth/sign-out` | `app/api/auth/sign-out/route.ts` |
| `GET /api/auth/session` | `app/api/auth/session/route.ts` |
| `GET /api/auth/get-session` | `app/api/auth/get-session/route.ts` |
| `POST /api/auth/refresh` | `app/api/auth/refresh/route.ts` |
| `POST /api/auth/register` | `app/api/auth/register/route.ts` |
| `POST /api/auth/forgot-password` | `app/api/auth/forgot-password/route.ts` |
| `POST /api/auth/reset-password` | `app/api/auth/reset-password/route.ts` |
| `POST /api/auth/change-password` | `app/api/auth/change-password/route.ts` |
| `GET /api/auth/verify-email` | `app/api/auth/verify-email/route.ts` |
| `POST /api/auth/resend-verification` | `app/api/auth/resend-verification/route.ts` |
| `POST /api/auth/magic-link` | `app/api/auth/magic-link/route.ts` |
| `GET /api/auth/magic-link/verify` | `app/api/auth/magic-link/verify/route.ts` |
| `POST /api/auth/otp/email` | `app/api/auth/otp/email/route.ts` |
| `POST /api/auth/otp/sms` | `app/api/auth/otp/sms/route.ts` |
| `POST /api/auth/2fa/setup` | `app/api/auth/2fa/setup/route.ts` |
| `POST /api/auth/2fa/verify` | `app/api/auth/2fa/verify/route.ts` |
| `POST /api/auth/2fa/backup-codes` | `app/api/auth/2fa/backup-codes/route.ts` |
| `POST /api/auth/passkey/register` | `app/api/auth/passkey/register/route.ts` |
| `POST /api/auth/passkey/authenticate` | `app/api/auth/passkey/authenticate/route.ts` |
| `GET /api/auth/permissions` | `app/api/auth/permissions/route.ts` |
| `POST /api/auth/sso/check` | `app/api/auth/sso/check/route.ts` |

Related auth routes outside `app/api/auth/**`:
- `POST /api/v1/auth/register` (`app/api/v1/auth/register/route.ts`)
- `GET /api/admin/analytics/auth` (`app/api/admin/analytics/auth/route.ts`)
- `GET /api/admin/analytics/auth/events` (`app/api/admin/analytics/auth/events/route.ts`)
- `GET /api/admin/analytics/auth/metrics` (`app/api/admin/analytics/auth/metrics/route.ts`)
- `POST /api/streaming/platforms/auth/:platform` (`app/api/streaming/platforms/auth/[platform]/route.ts`) — starts authenticated platform OAuth linking and returns `{ auth_url }`.
- `POST /api/streaming/platforms/auth/:platform/callback` (`app/api/streaming/platforms/auth/[platform]/callback/route.ts`) — validates callback payload and updates/creates the caller-owned `streaming_platforms` record.

## 3) Implemented auth-related UI routes

- `/login` (`app/login/page.tsx`)
- `/logout` (`app/logout/page.tsx`)
- `/forgot-password` (`app/forgot-password/page.tsx`)
- `/reset-password` (`app/reset-password/page.tsx`)
- `/verify-email` (`app/verify-email/page.tsx`)
- `/auth/magic-link` (`app/auth/magic-link/page.tsx`)
- `/settings/security` (`app/settings/security/page.tsx`)
- `/settings/sessions` (`app/settings/sessions/page.tsx`)

Removed stale reference pattern: these settings pages are direct routes in `app/settings/**` and not only abstract route-target placeholders.

Note: middleware still treats `/signup` as public, but no `app/signup/page.tsx` currently exists.

## 4) Session and fallback behavior (as implemented)

- Protected routes are evaluated in `middleware.ts`.
- If no valid auth session is resolved, browser routes redirect to `/login`; API routes return `401`.
- Privileged route prefixes are excluded from the public allowlist: seller surfaces (`/seller/**`, `/api/seller/**`, `/api/v1/seller/**`) and admin surfaces (`/admin/**`, `/ecommerce/admin/**`, `/api/admin/**`) always require authenticated role-aware checks. Interactive app surfaces (`/chat`, `/runash-chat`, `/live`) are also treated as protected routes and require a valid session.
- Session checks rely on Better Auth session cookies, middleware validation through `/api/auth/get-session`, and `auth.api.getSession` in server helpers/accessors.
- Session minting for passkey and magic-link paths now uses the canonical auth secret resolver in `lib/auth.ts`, keeping a single source-of-truth secret for Better Auth runtime and custom JWT issuance.
- Legacy NextAuth cookie parsing remains available in session accessor fallback paths when feature-flagged compatibility fallback is enabled.

### 4.2) Migration compatibility notes: cookie/session-token transition

- **Primary cookie name:** new/renewed sessions are written to `better-auth.session-token` (or the secure-prefixed variant in production environments).
- **Legacy cookie handling:** legacy `next-auth.session-token` and `__Secure-next-auth.session-token` cookies are explicitly cleared on new session writes.
- **Fallback verification behavior:** when legacy cookies are still present during rollout windows, server session accessor fallback can verify tokens with `NEXTAUTH_SECRET` and then `BETTER_AUTH_SECRET` to reduce migration lockout risk.
- **Failure mode:** if Better Auth is enabled and no valid Better Auth session is resolved, protected routes continue to reject (`401`) or redirect (`/login`) exactly as before.
- **Rollback guidance:** if migration issues are detected, keep `use_better_auth` enabled and temporarily set `FEATURE_FLAG_ALLOW_LEGACY_NEXT_AUTH_FALLBACK=true` to restore compatibility reads for legacy NextAuth cookies while incident response runs; remove the fallback flag after mitigation.


## 4.1) Feature-flag rollout and validation status (2026-02)

- Better Auth rollout is staged via `FEATURE_FLAG_USE_BETTER_AUTH_PERCENT` (internal -> 10% -> 50% -> 100%).
- Focused automated tests now cover session lifecycle outcomes, RBAC route enforcement, and admin endpoint permission mapping before each stage increase.
- Stage promotion requires healthy error/security metrics and no payment-adjacent auth regressions.
- Rollback trigger thresholds and runbook are tracked in `docs/RELEASE_NOTES_AUTH_RBAC_ROLLOUT_2026-02.md`.

## 5) Drizzle / Neon / Better Auth migration-config artifacts

### Present artifacts
- `drizzle.config.ts` points Drizzle output to `db/migrations`.
- `db/schema.ts` exists as a planned-phase schema anchor.
- Neon access layers exist in `lib/db/neon.ts` and `lib/neon/*`.
- SQL-first migrations currently live under `scripts/sql/*.sql` and related `scripts/*.sql` files.

### Added in this update
- `db/migrations/README.md` — migration ownership and execution status.
- `db/migrations/0000_auth_neon_better_auth_baseline.sql` — executable baseline migration artifact for Better Auth and RunAsh session tables.

### Planned next steps
- Add Drizzle migration journal metadata when migration generation is turned on for CI-managed schema rollout.
- Keep schema registry updates (`db/schema.ts`) synchronized with any auth table contract changes before release cut.

## 6) Payment-impacting auth notes

Auth updates in this document are documentation/alignment updates only and do not alter payment API contracts.

Payment flows remain dependent on:
- authenticated server session checks for billing/payment actions,
- role/organization-scoped authorization from `lib/rbac.ts`, and
- sensitive-field-safe logging requirements captured in `SECURITY.md`.

See also: `RunAsh_AI_Pay.md` and `RUNASH_PAY_BUSINESS_IMPLEMENTATION.md`.

## 7) Canonical admin role baseline and migration guidance (2026-02)

RunAsh admin authorization now standardizes on three canonical baseline roles for protected admin routes.

| Canonical role | Baseline permissions | Notes |
|---|---|---|
| `viewer` | `admin:access`, `dashboard:read` | Dashboard read-only; no write/settings/system controls. |
| `operator` | `viewer` + `operations:restart`, `operations:cache:clear`, `system:maintenance` | Operational controls only; no global config write (`admin:settings`). |
| `admin` | Full CRUD/system management (`users:*`, `content:*`, `admin:*`, `payments:*`, `streams:*`, `system:*`) | Includes global settings and destructive system control actions. |

### Final RBAC responsibility matrix (auth + payment-sensitive surfaces)

| Surface | `viewer` | `operator` | `admin` |
|---|---|---|---|
| Auth analytics (`/api/admin/analytics/auth*`) | Read-only aggregate visibility | Read + redacted stream visibility | Full visibility + incident triage views |
| Admin role/permission mutation | No | No | Yes (plus super-admin restrictions where applicable) |
| Payment operations (`payments:*`) | No | Limited to assigned org operational actions | Full privileged payment/admin actions |
| System/settings mutation (`admin:settings`, `system:*`) | No | No | Yes |

### Legacy role compatibility mapping

To avoid lockouts during migration, legacy role values continue to resolve into the canonical capability baseline for runtime permission checks and now retain legacy permission compatibility bundles:

- Viewer-equivalent: `guest` -> `viewer`
- Operator-equivalent: `user`, `moderator`, `premium`, `business_operator`, `startup_operator`, `customer_operator`, `customer_finance` -> `operator`
- Admin-equivalent: `admin`, `super_admin`, `business_admin`, `startup_admin`, `customer_admin` -> `admin`

Role-assignment endpoints continue accepting legacy role inputs, but stored role values are now normalized to canonical baseline roles (`viewer`/`operator`/`admin`) so new updates converge on a single RBAC contract. Legacy role-specific capabilities (for example `customer_finance` refund visibility) are merged with the baseline bundle to prevent access regressions for existing users.

### Protected admin endpoint enforcement

- All `app/api/admin/**` handlers use `requireAdminAuthorization`.
- Required permissions are resolved from route+method policy mapping (`lib/rbac.ts`) and merged with handler-explicit requirements before authorization decisions. Unmapped `app/api/admin/**` routes without explicit handler permissions are denied as configuration errors to avoid accidental authorization gaps.
- Unauthorized/forbidden admin guard outcomes are standardized to JSON `401/403` envelopes with `requestId` and mirrored `x-request-id`/`x-correlation-id` headers for traceability.
- Sensitive admin operations emit audit events, including user CRUD (`user.created`/`user.updated`/`user.deleted`), role changes (`user.role.changed`), and settings writes (`admin.settings.updated`).
- Role assignment to admin-capability roles is restricted to users already resolving to canonical `admin` capability; `super_admin` assignment remains super-admin only.


## 2026-02 auth/admin implementation update

- Added explicit session fetch compatibility endpoint (`GET /api/auth/get-session`) and session refresh endpoint (`POST /api/auth/refresh`) for middleware/docs parity.
- Admin auth storage is now backed by PostgreSQL tables for session records (`user_sessions`), role grants (`admin_role_grants`), permission overrides (`admin_permission_overrides`), and admin activity logs (`admin_activity_logs`).
- Admin management/monitoring endpoints now enforce stricter schema validation and server-side pagination/filtering for users, roles, permissions, sessions, audit logs, auth events, and security threats/events.

## 8) 2026-02 auth observability + monitoring visibility hardening

- Added structured auth metrics categories for authentication, authorization, session, admin, and alert streams.
- New alert-friendly categories are emitted for suspicious login behavior and permission abuse to support on-call routing.
- Forbidden-action and session-invalidation metrics are now first-class counters in dashboard aggregates.
- Operational monitoring now supports role-based visibility:
  - `viewer`: aggregate trend totals only,
  - `operator`: aggregate + redacted recent event stream,
  - `admin`: full aggregate + realtime metrics stream.
- Login instrumentation now uses hashed principal fingerprints for repeated-failure detection and never stores raw identifiers.


### 4.3) Current helper layering

- **Client session helper:** `lib/auth/access-client.ts` is the unified session-check hook for client components (`useAuthSession`), plus shared imperative helpers (`getAuthSession`, `signOutWithRedirect`).
- **Server session helper:** `lib/auth.ts` is the single source of truth for server session reads; `lib/auth/session.ts` + `lib/auth/session-accessor.ts` are migration-safe wrapper entry points only.
- **Migration fallback flag gate:** legacy NextAuth cookie verification runs only when `FEATURE_FLAG_ALLOW_LEGACY_NEXT_AUTH_FALLBACK` is enabled; without this flag, only Better Auth cookies (`better-auth.session-token`, `__Secure-better-auth.session-token`) are accepted.

## 13) Account Center auth UI surface (2026-02)

- Added a composable auth UI layer at `components/auth/auth-ui.tsx` and `components/auth/auth-ui-provider.tsx`, wired globally through `components/providers.tsx`.
- Added route `app/account/page.tsx` as an account center surface with:
  - avatar upload card shell (`UpdateAvatarCard`),
  - account/security/settings cards (`AccountSettingsCards`, `SecuritySettingsCards`, `ChangeEmailCard`, `ChangePasswordCard`, `PasskeysCard`, `TwoFactorCard`, `SessionsCard`, `ProvidersCard`, `ApiKeysCard`),
  - organization cards (`OrganizationSwitcher`, `OrganizationSettingsCards`, `OrganizationMembersCard`), and
  - conditional/redirect auth helpers (`AuthLoading`, `SignedIn`, `SignedOut`, `RedirectToSignIn`).
- Introduced redirect hook helper `useAuthenticate()` for client-side auth guard behavior that routes unauthenticated visitors to sign-in while preserving a `next` return URL.

## 12) 2026-02 Better Auth server-module migration notes

### Cookie/token behavior changes

- Middleware and auth API handlers now resolve session validity through one canonical code path: `lib/auth.ts#getAuthSessionFromHeaders`.
- `GET /api/auth/get-session`, `GET /api/auth/session`, and `POST /api/auth/refresh` now all call the same server session resolver instead of directly calling `auth.api.getSession` in route-level fragments.
- Legacy NextAuth token parsing (`next-auth.session-token`, `__Secure-next-auth.session-token`) remains available only through feature-flagged fallback and is no longer a primary session source.

### Compatibility assumptions

- Better Auth cookies remain the default and expected session carrier for authenticated traffic.
- Legacy NextAuth tokens are treated as temporary migration artifacts and must be explicitly enabled with `FEATURE_FLAG_ALLOW_LEGACY_NEXT_AUTH_FALLBACK`.
- Wrapper modules (`lib/auth/session.ts`, `lib/auth/session-accessor.ts`) are retained only for import compatibility while callers converge on `@/lib/auth`.

### Rollback plan

If migration parity regressions are detected (for example: unexpected `401` from protected routes, or session continuity failures):

1. Enable `FEATURE_FLAG_ALLOW_LEGACY_NEXT_AUTH_FALLBACK=true` to restore legacy token fallback reads.
2. Revert route-level imports for `/api/auth/session`, `/api/auth/get-session`, and `/api/auth/refresh` to prior behavior if required.
3. Validate middleware auth redirects and protected API authorization behavior.
4. Disable the fallback flag again after parity issues are remediated and confirmed in staging.

## 9) 2026-02 RBAC assignment validation hardening

- Protected admin UI coverage now includes `/ecommerce/admin`, enforced through `requireAdminUiRouteAccess` and route-policy permission resolution (`admin:analytics`).
- Role assignment endpoint validation now verifies target user existence before role mutation.
- Permission assignment/revocation endpoints now:
  - reject self-targeted permission override mutations,
  - verify target user existence, and
  - verify the permission key exists in `admin_permissions` before applying grants/revokes.


## 10) 2026-02 auth security telemetry expansion

- Structured security audit events are now emitted for login attempts/outcomes, admin role changes, permission grant/revoke operations, and privileged admin actions.
- Admin authorization denials (`401/403`) now emit `auth.forbidden.access` audit events with sanitized reason codes and route metadata.
- Added health metrics endpoint (`/api/admin/analytics/auth/metrics`) exposing failed auth, forbidden access, and session revoke counters plus previous-window spike detection.
- Auth analytics dashboard now surfaces auth/security health monitoring panels and alert cards when thresholds/spike rules trigger.

## 11) Gradual rollout plan (internal → partial → full) with rollback triggers

To reduce auth/session/RBAC/admin CRUD risk, ship in three gated phases with explicit stop and rollback conditions.

### Phase A — Internal-only rollout

- **Audience:** RunAsh internal users and test tenants only.
- **Coverage:** New auth/session accessor behavior, RBAC route policy enforcement, and admin CRUD authorization checks enabled behind feature flags.
- **Gate to proceed:**
  - `5xx` on auth/admin surfaces does not exceed baseline by more than 0.5% for 24h.
  - Forbidden/unauthorized responses are explainable by policy (no unexplained spikes).
  - No P1/P2 incidents involving login/session continuity or admin lockout.

### Phase B — Partial rollout

- **Audience:** Controlled tenant subset (for example 10% → 25% → 50%).
- **Coverage:** Expand the same feature-flag bundle to a representative customer mix.
- **Gate to proceed:**
  - Session refresh/revalidation success remains within expected SLO bounds.
  - Admin CRUD workflows (create/update/delete + role/permission mutation) complete without elevated error rates.
  - Support/ops ticket volume for auth failures remains within normal variance.

### Phase C — Full rollout

- **Audience:** 100% of production tenants.
- **Coverage:** Remove percentage targeting; retain kill-switch flags for one release window.
- **Post-rollout watch window:** 72h heightened monitoring on auth/security dashboards and admin activity audit streams.

### Rollback triggers (immediate)

Rollback to prior stable auth/session path if any of the following occur:

- Sustained `5xx` increase > 1% for 15 minutes on `/api/auth/**`, `/api/sessions/**`, or `/api/admin/**`.
- Repeated session invalidation anomalies (unexpected sign-outs) across multiple tenants.
- Admin authorization regressions causing privileged user lockout from critical operations.
- Security regression indicators (unexpected auth-forbidden spikes, policy bypass evidence, or sensitive data exposure in logs).

### Rollback execution

1. Disable rollout flags for affected cohorts (full kill switch if blast radius is unclear).
2. Revert to last known-good deployment artifact.
3. Confirm auth/session recovery through smoke checks (`/api/auth/get-session`, admin read/write probes).
4. Publish incident summary with root-cause hypothesis and next safe re-rollout window.

## 2026-02 Phone OTP plugin rollout

- Added `POST/PUT/PATCH /api/auth/phone-otp` endpoints backed by `lib/auth/plugins/phone-otp.ts` for start, verify, resend, cooldown, and challenge lifecycle handling.
- Phone OTP challenges now persist with TTL windows, resend cooldown metadata, and verification attempt counters in PostgreSQL tables (`phone_otp_challenges`, `phone_verifications`, `phone_otp_throttles`).
- Anti-abuse controls include per-IP and per-identifier throttling, optional captcha hook validation (`PHONE_OTP_CAPTCHA_HOOK_URL`), and security audit-log events with hashed identifier metadata.
- UI now exposes phone verification widgets in login/signup and shared auth form components; green "Verified" state appears only after successful server-side OTP verification.
- Auth UI now uses reusable `CardAlert` + `CardAlertDialog` severity variants for OTP resend states, cooldown lockout messaging, verification outcomes, and OAuth account-link confirmations.
- Admin auth UI now applies the same confirmation pattern to high-risk role changes, user deletion, and identity-provider change acknowledgements.

## 2026-02 OAuth extensibility + login UX hardening update

- Added generic OAuth provider registration support via `lib/auth/plugins/generic-oauth.ts`, driven by `AUTH_GENERIC_OAUTH_PROVIDERS` JSON config and per-provider secret env fallbacks.
- Added account-linking policy guards for:
  - manual linking requirements on mobile user agents,
  - forced-link provider safeguards requiring step-up verification,
  - explicit unlink policy evaluation for step-up + alternative-login-method checks (`POST /api/auth/account/unlink`).
- Added Google One Tap wiring:
  - client prompt component (`components/auth/google-one-tap.tsx`),
  - callback verification endpoint (`POST /api/auth/google-one-tap/callback`) with verified-email enforcement.
- Added OAuth preview-domain proxy callback endpoint (`GET /api/auth/oauth/proxy`) for allowed preview hosts.
- Added last-login-method tracking surfaced in sign-in UI (`/login` and `components/auth/login-form.tsx`).

### New auth routes added in this update

| Route | File |
|---|---|
| `POST /api/auth/google-one-tap/callback` | `app/api/auth/google-one-tap/callback/route.ts` |
| `GET /api/auth/oauth/proxy` | `app/api/auth/oauth/proxy/route.ts` |
| `POST /api/auth/account/unlink` | `app/api/auth/account/unlink/route.ts` |

## 2026-02 Anonymous + multi-session + OTT auth extension

- Added anonymous identity creation route (`POST /api/auth/anonymous`) that returns a non-PII identity id (`anon_*`) and a short-lived anonymous cookie session handle.
- Added anonymous account-linking route (`POST /api/auth/account/link-anonymous`) so signed-in users can bind an anonymous identity later without exposing email/phone in the anonymous flow.
- Added session mode registry support (`cookie`, `bearer`, `ott`) with device metadata and per-session scope to enable multi-session switching (`GET /api/auth/sessions`, `POST /api/auth/sessions/switch`).
- Added one-time transfer token routes for cross-domain single-use session handoff (`POST /api/auth/ott/issue`, `POST /api/auth/ott/verify`).
- Added bearer token session route (`POST/DELETE /api/auth/bearer-token`) and bearer resolver path in `getAuthSessionFromHeaders` so API auth can work with either secure cookies or bearer tokens.
- Session invalidation now updates both legacy session tables and the auth session registry to keep revoke/rotation behavior consistent across auth modes.

## 2026-02 Enterprise identity expansion (SSO + SCIM + Device + SIWE)

- Added enterprise SSO provider management support for `oidc`, `oauth2`, and `saml2` configurations with organization-level mapping persistence (`sso_organization_mappings`).
- Added SCIM v2 endpoints for user and group provisioning/deprovisioning:
  - `GET/POST/PATCH /api/scim/v2/Users`
  - `GET/POST/PATCH /api/scim/v2/Groups`
  and immutable audit trail recording in `scim_audit_trails`.
- Added OAuth Device Authorization Grant (RFC 8628 style) endpoints:
  - `POST /api/auth/oauth/device/authorize`
  - `POST /api/auth/oauth/device/verify`
  - `POST /api/auth/oauth/device/token`
- Added SIWE plugin and endpoints for nonce issuance and wallet session binding:
  - `POST /api/auth/siwe/nonce`
  - `POST /api/auth/siwe/verify`
- Added admin identity management APIs and UI for provider inventory and protocol health visibility:
  - `GET/POST /api/admin/identity/providers`
  - `GET /api/admin/identity/health`
  - `GET /admin/identity`

## 2026-02 Account lifecycle + anti-abuse + WebAuthn UX hooks

- Added captcha-hook verification middleware utility (`lib/auth/captcha-middleware.ts`) and wired it into high-risk routes:
  - `POST /api/auth/register`
  - `POST /api/auth/sign-in`
  - `POST /api/auth/reset-password`
  - `POST /api/auth/otp/email`
  - `POST /api/auth/otp/sms`
- Added account lifecycle APIs under `/api/auth/account`:
  - `GET /api/auth/account` (fetch account profile)
  - `PATCH /api/auth/account` (update account fields)
  - `DELETE /api/auth/account` (2-step secure deletion with email verification code)
  - `POST|PUT /api/auth/account/change-email` (request + confirm email change)
  - `POST /api/auth/account/password` (`set`, `change`, `verify` operations)
  - `POST /api/auth/account/resend-code` (verification/OTP resend)
- Added before-delete and after-delete callback hooks in `lib/auth/account-lifecycle.ts` for pre-delete cleanup and post-delete auditability.
- Added password-strength progress UX helper (`components/auth/password-strength-meter.tsx`) and surfaced it in sign-up/reset-password flows.
- Added robust auth error UI route (`/auth/error`) with recovery CTAs and email-change confirmation handling.
- Added client-side WebAuthn roadmap event hooks (`components/auth/webauthn-roadmap-hooks.tsx`) for passkey/biometric login readiness instrumentation.

## Better Auth client helpers and UI cards


This repository now exposes Better Auth client helpers from:

- `lib/auth/client.ts`
- `lib/auth-client.ts` (compatibility re-export)

Available exports:

- `authClient`
- `signIn`
- `signOut`
- `signUp`
- `useSession`

Sample auth UI pages are available at:

- `/auth/better-signin`
- `/auth/better-signup`

These pages include:

- Email/password sign-in and sign-up
- Passkey sign-in action
- Social provider buttons (Google, GitHub, Hugging Face, LinkedIn, Twitter)
- Card alert feedback states and password strength indicator


## Dashboard authenticated data access + realtime subscriptions (2026-02)

- Dashboard APIs now resolve identity from `getServerAuthSession` on the server boundary and reject mismatched `x-user-id` headers when present.
- UI dashboard fetches no longer rely on client-provided identity fallbacks; `x-user-id` is retained only for internal contracts and is derived from verified session identity.
- Dashboard refresh orchestration moved from polling-only behavior to an SSE subscription fan-in for `stream`, `chat`, `editor`, and `store` invalidation channels.

## 2026-02 stream scheduling auth boundary hardening

- `/api/streams/schedule` now requires a resolved server session via `getServerAuthSession`; unauthenticated calls return `401 Unauthorized`.
- Stream schedule ownership is keyed exclusively by `session.user.id`; `x-user-id` overrides and `demo-user` fallback behavior were removed.
- Development-only fallback identity is available only when explicitly enabled with `ENABLE_DEV_SCHEDULE_USER_FALLBACK=true` plus `DEV_SCHEDULE_FALLBACK_USER_ID` under `NODE_ENV=development`, and remains disabled by default.

 
## 2026-02 tenant boundary guard for user profile/admin user management

- Added shared tenant boundary helpers in `lib/api/route-auth.ts` to standardize session `ssoOrganization` resolution and resource-tenant enforcement.
- `GET|PATCH /api/users/[id]/profile` now enforce tenant scoping for reads and writes.
- Admin user-management endpoints (`/api/admin/users/*`) now enforce same-tenant access before reading or mutating target users.
- Legacy compatibility for users with `sso_organization_id IS NULL` is preserved:
  - Reads remain allowed for authenticated actors in their current tenant scope.
  - First successful tenant-scoped mutation migrates the legacy row by backfilling `sso_organization_id` with the actor tenant.
  - Cross-tenant access continues to be denied even when legacy compatibility mode is enabled.

## 2026-02 OTP + passwordless route hardening

- OTP verification now executes explicit query branches for `email` and `phone_number` lookups to avoid mixed-identifier predicate ambiguity.
- OTP and magic-link internal logs use structured, redacted metadata (`identifierHash`, `purpose`, `outcome`) and avoid emitting raw OTP codes, tokens, email addresses, or phone numbers.
- `PUT /api/auth/otp/email` login verification now consistently issues both server session records and auth cookies after successful OTP verification.
- `forgot-password`, `reset-password`, `verify-email`, and magic-link endpoints now align on replay-safe token handling, endpoint-level throttling, and consistent error payloads for invalid/expired token states.
- Magic-link verification now records a server-side user session before setting browser auth cookies to match password/OTP session issuance expectations.


## 2026-02 Better Auth baseline schema + session decommissioning controls

### Migration summary
- Replaced placeholder migration `db/migrations/0000_auth_neon_better_auth_baseline.sql` with concrete Better Auth baseline SQL for `users`, `accounts`, `sessions`, and `verification_tokens`.
- Migration is idempotent (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`) to support mixed-env rollouts.
- `db/schema.ts` now exposes active auth/session table mappings consumed by auth/session domain code.

### Session lifecycle behavior verified
- `GET /api/auth/sessions` now returns active concurrent sessions and `concurrentSessionCount` for UX/state reconciliation.
- `DELETE /api/auth/sessions` supports both single-session revoke (`sessionId`) and all-session revoke (`revokeAll=true`).
- `POST /api/auth/sessions/switch` preserves scoped session switching and not-found semantics.

### Legacy NextAuth fallback sunset path
- Legacy cookie fallback remains behind `allow_legacy_next_auth_fallback`.
- New kill switch `enforce_legacy_next_auth_fallback_sunset` hard-disables fallback for decommission windows.
- Optional date cutoff via `FEATURE_FLAG_ALLOW_LEGACY_NEXT_AUTH_FALLBACK_SUNSET_AT` (ISO timestamp) disables fallback after the configured instant.
- Telemetry events for retirement readiness:
  - `auth.legacy_fallback.used`
  - `auth.legacy_fallback.unavailable`
  - `auth.legacy_fallback.blocked`

### Rollout and rollback
1. Deploy migration to staging and production.
2. Validate Better Auth login + session listing/revoke/switch flows.
3. Monitor fallback telemetry; when `auth.legacy_fallback.used` is zero for a full release window, enable `enforce_legacy_next_auth_fallback_sunset`.
4. Remove legacy cookie parsing in follow-up release after sunset confirmation.

Rollback:
1. Set `FEATURE_FLAG_ENFORCE_LEGACY_NEXT_AUTH_FALLBACK_SUNSET=false` (or unset) to immediately re-enable fallback eligibility.
2. If needed, set `FEATURE_FLAG_ALLOW_LEGACY_NEXT_AUTH_FALLBACK=true`.
3. Keep schema changes in place (non-breaking additive migration); no destructive rollback required.
4. Re-validate auth session endpoints and monitor `auth.legacy_fallback.used` for expected recovery.

### Operator rollback commands (schema-only emergency path)

```sql
DROP TABLE IF EXISTS auth_one_time_transfer_tokens;
DROP TABLE IF EXISTS auth_session_registry;
DROP TABLE IF EXISTS auth_session_identities;
DROP TABLE IF EXISTS verification_tokens;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS accounts;
```

Use this destructive path only when the application rollback cannot restore service and after pausing auth writes. Because the baseline migration is additive, application rollback without table drops remains the default and safer strategy.


## Wallet/Link Authentication Hardening

- Wallet Link checkout initiation requires **step-up auth context** for high-value and high-risk operations:
  - `human_confirmed=true` for HITL approval gates.
  - `mfa_verified=true` for MFA-gated flows.
- High-risk wallet mutations (default method switch, subscription status updates) are rejected unless HITL + MFA assertions are present.
- Geo/risk checks are evaluated at request time and surfaced as explicit reason codes to callers for adaptive auth UX (review queues, challenge loops, or hard-deny).
- Auth-adjacent telemetry for wallet/link flows is emitted only through sanitized structured logs; secrets, OTP values, and card data are not logged.


## 2026-02-28 auth-sensitive logging posture for billing lifecycle events

- Payment lifecycle event emission uses payment logging sanitizer utilities before any structured log output.
- Sensitive auth/payment fields are redacted by key-pattern policy (`token`, `secret`, `authorization`, `session`, `customer`, payment-method/card identifiers).
- This preserves auditability while preventing leakage of provider tokens, customer identifiers, and auth material in billing lifecycle logs.

### Rollback notes (auth-impact posture)

- Reverting lifecycle event emitters does not require auth contract, cookie/session, or RBAC schema rollback.
- If rollback is needed, keep sanitizer behavior intact and revert only lifecycle event callsites.

## 2026-02 settings security session/device management

- Added user-scoped settings security APIs for session and device operations:
  - `GET|PATCH|DELETE /api/settings/security/sessions`
  - `GET|POST|DELETE /api/settings/security/devices`
- Session responses are constrained to operational metadata (id/mode/scope/device/lastSeen timestamps) and do not expose bearer token values or token hashes.
- Trusted device management stores and revokes trust state by `(user_id, device_id)` to support auditable recovery and remote sign-out workflows.
- Settings UI now includes session/device tables and per-session scope editing for user-scoped integrations.

## 2026-02 settings security API contract + storage model update

- Added canonical settings architecture and endpoint contract documentation at `docs/SETTINGS_ARCHITECTURE_API_CONTRACT.md`.
- Session/device/2FA/API key settings behaviors are now documented as a single compatibility contract with additive-only response evolution.
- Storage model documentation now explicitly captures:
  - session registry and session identity linkage tables,
  - trusted-device ownership model `(user_id, device_id)`,
  - API key hash-only persistence and one-time plaintext return behavior,
  - 2FA enrollment/challenge/recovery storage as metadata + hashes only.

### Migration + rollback procedure (settings security)

1. Roll out additive settings-security schema changes and metadata backfills.
2. Validate sessions/devices/2FA/API-key settings endpoints against stable response keys.
3. If incidents are detected, rollback application artifacts first and temporarily gate new settings mutations.
4. Keep additive schema in place during incident response; avoid destructive rollback.


## 2026-03 OTP verification/session hardening update

- `verifyOTP()` now uses explicit identifier predicates for both variants (`email` and `phone_number`) instead of dynamic identifier-column construction, preserving query contract compatibility while reducing injection-risk surface.
- OTP observability was tightened to structured/redacted events only; auth logs continue to carry identifier hashes rather than raw email/phone/OTP values.
- Email OTP `PUT /api/auth/otp/email` login verification continues to issue a persisted auth session token and response cookies after successful OTP verification; non-login OTP purposes remain verification-only with no session issuance.
- Added OTP regression coverage for send/verify flow behavior, invalid and replayed OTP handling, and login-session cookie issuance boundaries.

### Risks + rollback

- **Risk:** low; changes are scoped to OTP verification and testability seams, with no public request/response schema changes.
- **Rollback:** revert the OTP hardening commit to restore previous OTP query/logging behavior and test structure; no migration is required.
