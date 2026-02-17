# RunAsh Auth Implementation Status

Last updated: 2026-02

This document tracks the **currently implemented** auth runtime, files, and routes in this repository. It intentionally excludes speculative endpoints that are not present in source.

Cross-links: `SECURITY.md`, `PLATFORM_GUIDE.md`, `docs/DOC_GOVERNANCE.md`.

## 1) Runtime and source-of-truth files

### Better Auth runtime and adapters
- `lib/auth.ts` — Better Auth instance, provider config, and account-linking hooks.
- `app/api/auth/[...nextauth]/route.ts` — Next.js route handler mounted via `toNextJsHandler(auth)`.
- `lib/auth/session-accessor.ts` and `lib/auth/session-accessor-handler.ts` — canonical server-side session resolution.
- `lib/auth/session.ts` — server session/user extraction (`userId`, `role`, `organizationId`).
- `lib/auth-helpers.ts` — app-facing auth helper bridge (`getSession`, `requireAuth`, `getCurrentUser`).

### Middleware and guard rails
- `middleware.ts` — public/protected route checks, `/login` redirect behavior, auth endpoint rate limiting, and server-side validation via `/api/auth/get-session`.
- `lib/auth-middleware.ts` — admin/API guard helpers for permissioned routes.
- `lib/auth-security-config.ts` — auth endpoint rate-limit profiles.

### Identity, RBAC, and observability
- `lib/rbac.ts` — role catalog and route-to-permission policy mapping.
- `lib/auth-observability.ts` and `lib/auth-analytics.ts` — auth metrics/audit instrumentation.
- `lib/auth-logger.ts` — auth-safe logging utilities.

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
- **Server session helper:** `lib/auth/session.ts` + `lib/auth/session-accessor.ts` remain the canonical server path.
- **Migration fallback flag gate:** legacy NextAuth cookie verification runs only when `FEATURE_FLAG_ALLOW_LEGACY_NEXT_AUTH_FALLBACK` is enabled; without this flag, only Better Auth sessions are accepted.
