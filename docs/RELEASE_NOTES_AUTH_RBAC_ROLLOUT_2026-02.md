# Release Notes — Auth/RBAC Rollout (2026-02)

## Summary
- Expanded focused test coverage for auth session lifecycle states (signed-in, signed-out, inactivity invalidation, legacy fallback) and deterministic feature-flag rollout behavior.
- Added route-level RBAC tests and admin permission-resolution tests to verify endpoint access controls for CRUD, analytics/logs, sessions, and unknown admin paths.
- Confirmed staged rollout policy for `FEATURE_FLAG_USE_BETTER_AUTH_PERCENT` with progressive traffic gates and security/error KPI checks at every stage.

## Rollout plan (feature-flag staged percentages)

| Phase | Flag value | Duration | Required checks before promote |
|---|---:|---|---|
| Internal | `FEATURE_FLAG_USE_BETTER_AUTH_PERCENT=0` + allowlist/internal sessions | 24h minimum | Smoke tests pass, no auth/session regressions |
| Phase 1 | `...=10` | 24h minimum | `auth_error_rate`, `session_invalidation_rate`, `admin_403_anomaly_rate`, `payment_auth_incident_count` at baseline |
| Phase 2 | `...=50` | 24-48h minimum | No sustained increase in auth failures, no new security alerts |
| Phase 3 | `...=100` | steady state | Continue metric watch for one full business cycle |

## Monitoring requirements by phase
- Error metrics: `auth_error_rate`, HTTP 401/403 distribution, session validation failures.
- Security metrics: suspicious sign-in volume, session invalidation spikes, privileged endpoint denial anomalies.
- Payment-adjacent metric: `payment_auth_incident_count` must remain at baseline (no auth-induced payment access regressions).

## Trigger conditions to halt or roll back
Initiate rollback if any condition persists for 10 minutes or exceeds on-call thresholds:
1. `auth_error_rate` exceeds baseline by 2x.
2. `admin_403_anomaly_rate` exceeds baseline by 2x for privileged endpoints.
3. Any confirmed security signal indicating unauthorized access risk.
4. Any payment/auth incident that blocks business-critical payment operations.

## Rollback instructions
1. Set `FEATURE_FLAG_USE_BETTER_AUTH=false` (hard disable) and clear percentage override.
2. Confirm legacy fallback session path is active and users can sign in/sign out.
3. Validate admin endpoints (`/api/admin/users`, `/api/admin/roles`, `/api/admin/sessions`) return expected authorization outcomes.
4. Confirm payment-adjacent auth flows recover (checkout/profile auth gates healthy).
5. Keep rollout frozen until metrics return to baseline for one full monitoring window.

## Risk
- **Risk level:** Medium.
- Primary risk is temporary authorization regressions during traffic increases.
- Payment contracts and external API signatures remain unchanged.

## Backward compatibility
- Existing payment/auth API signatures and field names are preserved.
- Legacy NextAuth cookie fallback remains available when Better Auth is disabled.

## Release documentation addendum (risk + rollback)
- **Impacted flows:** auth sign-in/session lifecycle, admin RBAC checks, payment-adjacent authorization gates.
- **Risk statement:** medium operational risk from temporary authorization regressions during staged rollout; no external payment API contract/schema changes in this release.
- **Rollback owner action:** on trigger conditions, disable Better Auth percentage rollout/hard flag, validate legacy compatibility reads, re-run payment auth smoke checks, and freeze promotions until baseline health is restored.
