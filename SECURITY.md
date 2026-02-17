# RunAsh Security Policy Notes

Last updated: 2026-02

Cross-links: `RUNASH-AUTH.md`, `README.md`, `docs/DOC_GOVERNANCE.md`.

## 1) Account-linking policy (OAuth / social providers)

RunAsh account linking is deny-by-default and implemented through Better Auth database hooks.

Policy requirements:
1. Provider subject (`providerId + accountId`) must not already be linked to a different user.
2. Primary account email must already be verified before linking.
3. Verified-identity linking controls are enforced when `AUTH_ENFORCE_VERIFIED_IDENTITY_LINKING=true`:
   - request must carry verified identity/step-up signal headers, and
   - provider identity token evidence must be present.
4. Linking decisions are auditable via sanitized auth metrics/events.
5. Sensitive identity artifacts are never logged in plaintext.

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

## 3) RBAC model

RunAsh uses role + permission enforcement with route-level checks.

### Role families
- Baseline roles: `viewer`, `operator`, `admin`.
- Legacy/support roles retained for compatibility, including customer/business/startup operator and admin variants.

### Permission model
- Permissions include domains such as admin access/settings, analytics, operations, streams, users, payments, and system controls.
- Admin API endpoints are mapped to explicit permission requirements by route prefix and (where needed) HTTP method.

### Payment-sensitive RBAC expectations
- Payment and billing actions require authenticated server session identity.
- Customer payment roles are valid only with organization scope.
- Privileged payment actions (for example refunds/admin mutations) require elevated permissions and ownership checks.

## 4) Logging and data handling

- Never log raw credentials, tokens, cookies, OTPs, payment instruments, CVV/PAN-equivalent fields, or provider token payloads.
- Use request IDs and redacted metadata for traceability.
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
