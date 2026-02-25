# RunAsh Pay — Business & Startup Implementation

_Last verified: 2026-02-24 (UTC)_

This document is limited to payment/business implementation policy. Generic contributor/process policy is canonicalized in `docs/CONTRIBUTOR_POLICY_INDEX.md` and `TEAM_GUIDE.md`.

## Segment implementation scope

### Startup segment
- Prioritize fast integration, clear billing UX, and predictable transaction operations.
- Baseline capabilities: checkout links, basic settlement visibility, refund support, and webhook integrations.

### Business segment
- Prioritize high-volume processing, reconciliation, policy controls, and auditability.
- Extended capabilities: advanced reporting, role-scoped finance operations, and enterprise reconciliation workflows.

## 2026-02 implementation notes

- Canonical gateway module path is `lib/payment-gateways/pay.ts`; legacy `lib/payment-getways/pay.ts` remains temporary compatibility alias.
- Migration status (2026-02-24): repository import sweep shows zero remaining runtime imports of `payment-getways/pay`; shim retained temporarily for backward compatibility.
- CI guard added: `npm run lint:payment-getways-imports` fails on any new `payment-getways/pay` import outside the shim allowlist.
- Payment and business APIs retain existing field names and API signatures during auth runtime migration.
- Better Auth rollout remains staged behind `FEATURE_FLAG_USE_BETTER_AUTH_PERCENT` with explicit rollback guardrails.
- Auth hardening updates (verified linking, session invalidation, throttling) are contract-compatible for payment APIs.
- Admin auth/org tooling updates (organization lifecycle + provider mapping + tenant user assignment) are operational-only and do not modify payment field contracts or payment API signatures.
- Auth signup flow was unified through Better Auth server registration (`auth.api.signUpEmail`) with compatibility response mapping; no payment route fields or business payment contracts changed.
- Incident and rollback runbook reference for auth/org config operations: `docs/AUTH_ORG_INCIDENT_RUNBOOK.md`.

## Compatibility, risk, and rollback

- Backward compatibility is mandatory for payment routes unless a versioned migration is explicitly introduced.
- Rollback trigger examples:
  - sustained payment auth failures,
  - checkout authorization anomalies,
  - webhook processing regressions.
- Rollback action: disable new rollout flags and restore last known-good auth/payment path before resuming rollout.

## Related canonical docs

- Payment system detail: `RunAsh_AI_Pay.md`
- Auth policy and migration details: `RUNASH-AUTH.md`
- Security requirements: `SECURITY.md`

## 2026-02 auth tenant-boundary compatibility note

- No payment contract field names or API signatures were changed in this update.
- Tenant-boundary enforcement for shared auth/admin user routes was hardened to prevent cross-tenant profile and admin-user access.
- Legacy user rows without `sso_organization_id` remain temporarily readable in-tenant and are migrated on first successful tenant-scoped mutation.

## Redirect orchestration rollout (2026-02)

- Checkout orchestration now standardizes provider redirect + return URLs across API and profile surfaces for startup and v1 billing routes.
- Rollback path: disable callback-based resume and fall back to provider-hosted success/cancel URL handling if signed-state verification fails unexpectedly.
- Monitoring focus: callback signature failures, reference mismatch rates, and pending->completed transition latency from webhook updates.
