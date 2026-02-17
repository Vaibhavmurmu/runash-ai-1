# Release Notes — Auth/RBAC Rollout (2026-02)

## Summary
- Added focused integration tests for auth session-state evaluation (signed-in, signed-out, invalidated) and admin RBAC permission resolution.
- Consolidated admin permission assembly into a shared helper to ensure consistent CRUD permission enforcement for `/api/admin/users` routes.
- Documented phased feature-flag rollout (internal → 10% → 50% → 100%), KPI thresholds, and rollback triggers.

## Risk
- **Risk level:** Medium.
- Primary risk is temporary authorization regressions as traffic percentage increases.
- Payment contracts are unchanged; risk is limited to auth gating behavior.

## Rollback
1. Set `FEATURE_FLAG_USE_BETTER_AUTH=false`.
2. Verify sign-in/sign-out/session checks and admin CRUD endpoints.
3. Halt phase progression until KPI anomalies return to baseline.

## Backward compatibility
- Existing payment/auth API signatures and field names are preserved.
- Legacy NextAuth cookie fallback remains available when the Better Auth flag is disabled.

## KPI tracking
- `auth_error_rate`
- `session_invalidation_rate`
- `admin_403_anomaly_rate`
- `payment_auth_incident_count`
