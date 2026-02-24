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
- Payment and business APIs retain existing field names and API signatures during auth runtime migration.
- Better Auth rollout remains staged behind `FEATURE_FLAG_USE_BETTER_AUTH_PERCENT` with explicit rollback guardrails.
- Auth hardening updates (verified linking, session invalidation, throttling) are contract-compatible for payment APIs.

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
