# RunAsh Auth Implementation Status

Last updated: 2026-02

## Security hardening update (2026-02)

- OAuth account linking now enforces verified identity linking by default at runtime (no permissive fallback toggle).
- Sensitive account actions (password change, API key rotation, and session revoke-all) now trigger session invalidation and session cookie revocation to force secure re-authentication.
- Auth/admin-sensitive APIs are protected with stricter endpoint-specific rate limits in addition to baseline API rate controls.
- Auth event logging now redacts credentials/tokens/secrets and stores anonymized session identifiers for audit safety.

This document tracks the **currently implemented** auth runtime, files, and routes in this repository. It intentionally excludes speculative endpoints that are not present in source.

Cross-links: `SECURITY.md`, `PLATFORM_GUIDE.md`, `docs/DOC_GOVERNANCE.md`.

## 1) Runtime and source-of-truth files

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

- Convert `db/migrations/0000_auth_neon_better_auth_baseline.sql` from placeholder to executable migration once canonical Drizzle auth tables are finalized.
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
- `db/migrations/0000_auth_neon_better_auth_baseline.sql` — baseline planned migration artifact placeholder for auth/session/account tables.

### Planned next steps
- Convert planned baseline artifact into an executable migration once the canonical Drizzle table definitions are finalized.
- Add Drizzle migration journal metadata when migration generation is turned on for CI-managed schema rollout.

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

To avoid lockouts during migration, legacy role values continue to resolve into the canonical capability baseline for runtime permission checks:

- Viewer-equivalent: `guest` -> `viewer`
- Operator-equivalent: `user`, `moderator`, `premium`, `business_operator`, `startup_operator`, `customer_operator`, `customer_finance` -> `operator`
- Admin-equivalent: `admin`, `super_admin`, `business_admin`, `startup_admin`, `customer_admin` -> `admin`

Role-assignment endpoints continue accepting legacy role inputs, but stored role values are now normalized to canonical baseline roles (`viewer`/`operator`/`admin`) so new updates converge on a single RBAC contract.

### Protected admin endpoint enforcement

- All `app/api/admin/**` handlers use `requireAdminAuthorization`.
- Required permissions are resolved from route+method policy mapping (`lib/rbac.ts`) and merged with handler-explicit requirements before authorization decisions.
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
