# RunAsh Security Policy Notes

Last updated: 2026-02

Cross-links: `RUNASH-AUTH.md`, `README.md`, `docs/DOC_GOVERNANCE.md`.

## 1) Account-linking policy (OAuth / social providers)

RunAsh account linking is deny-by-default and implemented through Better Auth database hooks.

Policy requirements:
1. Provider subject (`providerId + accountId`) must not already be linked to a different user.
2. Primary account email must already be verified before linking.
3. Verified-identity linking controls are enforced by default (no permissive fallback):
   - request must carry verified identity/step-up signal headers, and
   - provider identity token evidence must be present.
4. Linking decisions are auditable via sanitized auth metrics/events.
5. Sensitive identity artifacts are never logged in plaintext.

## 1.1) Final auth architecture (2026-02 baseline)

RunAsh now operates with a single Better Auth runtime and shared server-side accessors:

- Runtime source of truth: `lib/auth.ts` (Better Auth config, secret resolver, account-linking hooks).
- Next.js auth entrypoint: `app/api/auth/[...nextauth]/route.ts` via `toNextJsHandler(auth)`.
- Middleware gate: `middleware.ts` validates protected requests through `GET /api/auth/get-session` before granting access.
- Server session accessors: `lib/auth/session-accessor.ts`, `lib/auth/session-accessor-handler.ts`, and `lib/auth/session.ts`.
- Authorization layer: `lib/auth-middleware.ts` + `lib/rbac.ts` route/method permission mapping.

This architecture preserves existing API signatures while tightening auth validation and auditability.

## 2) Session policy

### Session validation model
- Middleware and server helpers perform session checks using Better Auth session APIs and shared session accessors.
- Protected UI routes redirect to `/login` when unauthenticated.
- Protected API routes return HTTP `401` when unauthenticated.

### Cookie and compatibility behavior
- Canonical session cookies: `better-auth.session-token`, `__Secure-better-auth.session-token`.
- Legacy NextAuth cookie parsing remains available in session-accessor fallback paths for migration safety.

### Session lifecycle controls
- Fail closed when session lookups fail (treat as unauthenticated).
- Do not grant access based on cookie presence alone.
- Session-bound authorization checks must include role and organization scope where required.

### Session policy enforcement details
- Middleware only treats requests as authenticated after successful `/api/auth/get-session` response with both `session` and `user` payload members.
- Auth pages (`/login`, `/signup`, `/get-started`) redirect authenticated users to `/dashboard`.
- API routes blocked by middleware return JSON `401` without exposing credential material.
- Legacy NextAuth cookie verification remains compatibility-only and does not bypass Better Auth validation when Better Auth is enabled.

## 3) RBAC model

RunAsh uses role + permission enforcement with route-level checks.

### Role families
- Baseline roles: `viewer`, `operator`, `admin`.
- Legacy/support roles retained for compatibility, including customer/business/startup operator and admin variants.

### Canonical admin role matrix

| Role | Allowed baseline capabilities | Explicit restrictions |
|---|---|---|
| `viewer` | `admin:access`, `dashboard:read` | No admin write, no global settings, no system controls. |
| `operator` | Viewer + `operations:restart`, `operations:cache:clear`, `system:maintenance` | No `admin:settings`; cannot perform global config writes. |
| `admin` | Full CRUD and system management (users/content/settings/streams/payments/logs/control) | Highest standard role; destructive actions still require route-level checks. |

Legacy roles are mapped to this matrix for authorization decisions to preserve backward compatibility during migration windows.

### Permission model
- Permissions include domains such as admin access/settings, analytics, operations, streams, users, payments, and system controls.
- Admin API endpoints are mapped to explicit permission requirements by route prefix and (where needed) HTTP method.

### RBAC enforcement model (final)
- Default admin authorization path is `requireAdminAuthorization` in `lib/auth-middleware.ts`.
- Required permissions are derived by route + method policy (`getRouteRequiredPermissions` in `lib/rbac.ts`) and merged with handler-explicit permissions.
- Authorization is deny-by-default: missing session -> `401`; missing permission -> `403`.
- Forbidden responses include request correlation identifiers and structured audit/event logging.
- Legacy roles are normalized into canonical baseline capability tiers (`viewer`, `operator`, `admin`) for consistent enforcement.

### Payment-sensitive RBAC expectations
- Payment and billing actions require authenticated server session identity.
- Customer payment roles are valid only with organization scope.
- Privileged payment actions (for example refunds/admin mutations) require elevated permissions and ownership checks.

### Role migration guidance

- Existing legacy role records remain valid and are translated to canonical capability bundles at runtime.
- Admin role update APIs accept legacy and canonical role names, then normalize persisted values to canonical baseline roles.
- This migration path does not alter payment API payloads or endpoint contracts; it tightens authorization consistency only.

## 4) Logging and data handling

- Never log raw credentials, tokens, cookies, OTPs, payment instruments, CVV/PAN-equivalent fields, or provider token payloads.
- Use request IDs and redacted metadata for traceability.
- Admin authorization failures return standardized `401/403` JSON error envelopes that include `requestId` and correlation headers.
- Sensitive admin actions must write audit records with sanitized metadata (e.g., role-change + settings-key context, not raw secret values).
- Use structured logging for auth/admin/payment security events.

## 5) Incident response notes (auth + payment)

When auth/session/RBAC anomalies are detected:
1. **Triage:** classify severity and impacted surfaces (auth-only vs payment-impacting).
2. **Containment:** revoke active sessions for impacted principals; enforce step-up auth where needed.
3. **Credential hygiene:** rotate/revoke affected secrets or provider credentials.
4. **Protection checks:** verify no sensitive fields were emitted to logs; if detected, apply immediate redaction and retention controls.
5. **Rollback/mitigation:** revert to last known-safe auth feature-flag/config state when needed.
6. **Communication:** record impact window, root cause, and recovery actions in incident tracking.
7. **Post-incident:** add preventive controls/tests and update docs.

## 6) Payment/auth integration guardrails

- Payment flows must continue to enforce authenticated server-session identity and RBAC checks.
- Auth/security documentation changes must be reflected in payment documentation when policy affects operator or customer access.
- No payment flow contract breaks are allowed without migration notes.

## 6.1) Phased rollout + rollback trigger checklist (auth/payment)

Use this checklist for Better Auth and RBAC rollout on payment-adjacent traffic.

### Phase 0 - Internal only
- [ ] Enable for internal/staff accounts only.
- [ ] Validate login, session refresh, logout, and admin RBAC paths.
- [ ] Confirm no payment API contract or field changes.

### Phase 1 - Percentage rollout
- [ ] Set `FEATURE_FLAG_USE_BETTER_AUTH_PERCENT=10` and monitor for at least one full business cycle.
- [ ] Promote to 50% only if auth error and payment-auth incident metrics remain within baseline thresholds.

### Phase 2 - Full cutover
- [ ] Set `FEATURE_FLAG_USE_BETTER_AUTH_PERCENT=100`.
- [ ] Keep legacy compatibility fallback available for emergency rollback window.
- [ ] Confirm payment checkout, billing portal, and admin payment operations remain healthy.

### Explicit rollback triggers
- Sustained authentication failure rate > 2x baseline for 15+ minutes.
- Session invalidation anomalies affecting active payment operators.
- Any confirmed unauthorized payment/admin action tied to auth/RBAC regression.
- Elevated `403`/permission-denied spikes on payment-admin routes beyond alert thresholds.

### Rollback action
- Immediately disable percentage rollout (`FEATURE_FLAG_USE_BETTER_AUTH=false`), verify legacy session compatibility behavior, and re-run payment authorization smoke checks before re-enabling staged rollout.


### 2026-02 admin auth storage hardening update

- Role grants and permission overrides are now persisted as dedicated PostgreSQL entities (`admin_role_grants`, `admin_permission_overrides`) rather than transient runtime-only merges.
- Security and admin activity events remain audit-traceable through PostgreSQL-backed `admin_activity_logs`.
- Session management endpoints use PostgreSQL-backed `user_sessions` with validated pagination/filtering to support incident response and forensics workflows.

## 7) 2026-02 sensitive logging safeguards expansion

- API/auth logging redaction now explicitly blocks raw cookie and token-style value patterns from structured logs.
- Auth observability tags and audit details are sanitized for payment/auth payload and credential-like keys before emission.
- Session/security telemetry uses redacted/safe reason codes rather than raw session artifacts.
- Forbidden access and permission-abuse events are emitted as structured metrics for alerting without exposing user secrets.

## 9) 2026-02 session hardening controls

- Sensitive account actions (password changes, API key rotation, revoke-all sessions) now invalidate active server-side sessions.
- Sensitive-action responses clear Better Auth session cookies to force secure re-authentication and session rotation.
- Admin and settings-sensitive APIs now enforce tighter per-endpoint throttling in addition to baseline API protection.


## Auth session migration control

- Legacy NextAuth cookie/session fallback is disabled by default and can be temporarily enabled only through `FEATURE_FLAG_ALLOW_LEGACY_NEXT_AUTH_FALLBACK=true`.
- Rollback path for auth migration incidents: keep Better Auth as primary, enable the fallback flag for compatibility reads, validate login recovery, then disable the fallback flag and rotate incident credentials as needed.
- Do not log cookie values, legacy tokens, or secret material during migration diagnostics.

## 8) 2026-02 admin RBAC assignment safety updates

- Admin permission-override endpoints now reject self-targeted permission mutations and validate permission keys against the persisted `admin_permissions` registry before writes.
- Admin role-assignment endpoint now validates target-user existence before applying role updates.
- Protected admin page access policy now explicitly includes `/ecommerce/admin` under permission-based UI checks.


## 10) Auth and admin security monitoring thresholds (2026-02)

- New endpoint: `GET /api/admin/analytics/auth/metrics?windowMinutes=<n>` returns sanitized counters for:
  - failed auth (`auth.login.failed`)
  - forbidden access (`auth.forbidden.action`)
  - session revokes (`auth.session.revoked`)
- Endpoint includes threshold and spike alert metadata to flag suspicious activity bursts:
  - failed auth threshold: `20` per window
  - forbidden access threshold: `15` per window
  - session revoke threshold: `25` per window
  - spike threshold: `200%` vs previous window
- Structured audit events are recorded for login, permission changes, role changes, admin operations, and forbidden access checks with redacted metadata only.
