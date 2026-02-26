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

## 2026-02 invoice reliability additions

- Invoice creation now uses canonical billing invoice APIs with server-side validation for customer fields, line items, tax, due date, and currency.
- Payment-attempt linkage for invoices is persisted for reconciliation (`invoice_payment_attempts`), and webhook/payment confirmation paths now synchronize invoice lifecycle state.
- No payment route field names were removed; invoice API compatibility is preserved while adding POST create support.

## Payment Reliability Addendum (State Reconciliation)

- Add automated operational reconciliation via `POST /api/v1/payment/usage/reconcile` for payment intents and checkout sessions.
- Reconciliation should be run by a privileged billing admin actor and monitored for:
  - `paymentIntents.updated` spikes,
  - recurring `checkoutSessions.expired` counts.
- Transition auditing is now first-class via persisted timestamps to support incident forensics and rollback reviews.

## 2026-02 payment reliability campaign: test and rollback notes

- Impacted flows validated in this update:
  - checkout redirect roundtrip status resolution,
  - payment status page route mapping,
  - invoice create amount lifecycle calculations,
  - webhook duplicate idempotency handling,
  - failed/incomplete retry lifecycle outcomes.
- Backward compatibility confirmation: startup/business payment APIs and field names remain unchanged; no version bump needed.
- Migration/rollout: no data migration required; helper extraction only.
- Risks and mitigations:
  - **Risk:** helper extraction could desynchronize from route behavior. **Mitigation:** targeted payment tests added and required in validation commands.
  - **Risk:** environment gaps (missing `eslint`, missing DB/auth env for full build) can limit local confidence. **Mitigation:** run targeted tests plus CI in fully provisioned environment before release.
- Rollback plan:
  1. Revert helper extraction commit.
  2. Restore prior inline route/service logic.
  3. Re-run lint/build/tests in release environment and redeploy previous stable artifact if issues persist.


## 2026-02 payment safety validator enforcement update

- Impacted flows validated: validator middleware enforcement for create-intent and confirm execution path, including HITL/MFA thresholds normalized across INR/USD.
- Backward compatibility confirmation: no payment field names removed; response payload includes additive validator-decision metadata only.
- Rollback: revert validator middleware enforcement in API routes/service and restore prior confirmation behavior if incident metrics indicate false-positive blocking.


## 2026-02 residency-aware routing operations addendum

- Startup/business payment flows now evaluate merchant/customer geography for India vs US processing path selection through the shared routing policy module.
- Compliance-safe metadata contract for outbound gateway calls is now: `region`, `residency_policy_version`, and `request_id` (+ minimal business identifiers).
- Audit trail requirements: capture `routeDecision`, `requestId`, and sanitized non-sensitive metadata for `billing.checkout`, `billing.subscription`, `payment.create_intent`, and RunAshChat instant checkout relay flows.
- Risk + rollback: if provider rejects additive metadata keys, remove metadata enrichment from provider calls first (safe rollback) without changing payment API field names/signatures.

## 2026-02 RunAsh AI Link data reliability update

- Impacted flows: Link card save, Link session creation/OTP verification, wallet activity timeline, subscription snapshot management.
- Startup/business compatibility: no field-name or signature changes in existing wallet APIs; persistence moved from process memory to DB-backed repository for operational reliability.
- Audit + compliance controls:
  - tokenized payment references only for cards;
  - masked card metadata only (`last4`, `brand`, `exp`);
  - hashed verification codes and OTP attempt logging;
  - encrypted billing and verification-profile metadata at rest.
- Migration + rollout:
  1. apply `db/migrations/0002_wallet_link_persistence.sql`;
  2. run `scripts/sql/2026-02-26_backfill_wallet_demo_data.sql` for seeded demo continuity;
  3. validate wallet API read/write paths.
- Rollback:
  - revert wallet repository + migration commit and redeploy prior in-memory wallet fallback,
  - keep API contracts unchanged during rollback window.

## 2026-02 Reliability increment: domain webhooks + dead-letter operations

- Introduced domain-specific webhook ingress paths with Stripe signature verification to reduce blast radius and improve operational ownership across checkout/session/payment/subscription pipelines.
- Established replay-safe event lifecycle using `webhook_events` and `webhook_dead_letters` with:
  - idempotent provider event keys,
  - in-flight claim checks,
  - exponential retry backoff,
  - dead-letter escalation and controlled replay.
- Reconciliation now propagates asynchronous payment/subscription outcomes into wallet activity/timeline to keep customer-visible state aligned with backend settlement progression.
- Added webhook reconciliation health visibility for operations workflows (retry due, backlog, dead-letter depth, recent failures).
