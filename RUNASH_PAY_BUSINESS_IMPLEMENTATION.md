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
- Register API routing now invokes Better Auth server registration directly from `app/api/auth/register/route.ts` (delegating validation/compat mapping to the shared handler); response contract remains backward compatible for existing frontend consumers.
- Incident and rollback runbook reference for auth/org config operations: `docs/AUTH_ORG_INCIDENT_RUNBOOK.md`.


## 2026-02 editor render reliability hardening note (non-payment contract change)

- Change scope: editor render job reliability and security hardening (`/api/editor/render-jobs` rate limits, cancel semantics, worker timeout/retry, and log redaction).
- Payment/auth impact assessment: no payment contract fields, checkout/webhook schemas, or auth/payment API signatures were modified.
- Risk + rollback: low-to-medium operational risk (queue behavior changes). Rollback by reverting editor render job API/worker patch if cancellation or queue throughput regressions appear.
- Security posture: provider request/response operational logs are redacted to prevent sensitive token/prompt leakage in shared logs.

## 2026-03 live-stream provider reliability note (payment-contract safe)

- Change scope: live-stream provider abstraction in `services/live-stream/*` now supports real backend provisioning/stopping with persisted provider session metadata for reconciliation.
- Payment/auth impact assessment: no payment API field names, payment webhook schemas, or auth/payment signatures were changed.
- Risk + rollback: operational risk is isolated to live-stream session start/stop. Rollback by restoring prior live-stream provider implementation and disabling real provider selection env settings.
- Security posture: provider request/response logs are structured and explicitly redact credentials/tokens/secrets.

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

## 2026-02 RunAsh AI Link adoption plan (Startup + Business)

### Link adoption objectives

- Enable RunAshChat "Instant Checkout" for natural-language purchase intents through Relay Agent.
- Preserve startup velocity (minimal integration friction) while adding business-grade controls (auditability, reconciliation, role-scoped operations).
- Keep existing payment API signatures stable while progressively enabling provider-backed Link flows.

### Compliance operating model (US + India)

- **US path:** standard Stripe-hosted Link/checkout execution with webhook-backed settlement state.
- **India path:** residency-aware routing policy applies region controls and compliance-safe metadata (`region`, `residency_policy_version`, `request_id`) on outbound gateway calls.
- **Shared controls:**
  - no sensitive payment/auth material in logs,
  - OTP + verification artifacts hashed,
  - card metadata restricted to masked/tokenized representations,
  - auditable route decisions and reconciliation trails.
- **Contract safety:** regional routing/compliance controls are additive and do not change external API field names.

### Feature flags for staged rollout (internal -> beta -> GA)

- `FEATURE_FLAG_RUNASH_LINK_INTERNAL` — enables Link checkout for internal tenant allowlist only.
- `FEATURE_FLAG_RUNASH_LINK_BETA_MERCHANTS` — enables Link for selected beta merchant IDs/tenants.
- `FEATURE_FLAG_RUNASH_LINK_GA_PERCENT` — percentage rollout for general availability.
- `FEATURE_FLAG_USE_BETTER_AUTH_PERCENT` — retained auth rollout dependency guard for payment-adjacent session posture.

**Stage gates**
1. **Internal:** 0 external merchants; validate webhook health, callback integrity, and reconciliation latency.
2. **Beta merchants:** curated merchant cohort, monitored funnel/error metrics with daily rollback readiness.
3. **GA:** progressive percentage expansion after incident-free stability window and reconciliation SLO adherence.

### Rollback strategy

- Immediate rollback triggers:
  - Link verification failure spikes,
  - provider outage/degraded webhook delivery,
  - reconciliation backlog growth beyond runbook thresholds.
- Rollback actions (in order):
  1. set `FEATURE_FLAG_RUNASH_LINK_GA_PERCENT=0` and disable beta/internal flags as needed;
  2. route affected traffic back to stable non-Link checkout fallback;
  3. preserve webhook ingest and reconciliation for already-created attempts to avoid state drift;
  4. revert latest Link orchestration changes only if flag rollback is insufficient.
- Recovery exit criteria: error-rate normalization, webhook backlog burn-down, and successful replay/reconciliation parity checks.

## Incident handling runbook (payments/link)

### 1) Verification failures (OTP/session verification)

- **Detect:** elevated `session_verified` drop-off or verification error-rate alert in operations monitoring.
- **Triage:**
  - inspect wallet/link verify endpoint validation errors,
  - confirm provider OTP callback signatures,
  - check auth session validity (`/api/auth/get-session`) for affected tenant/user cohort.
- **Containment:** reduce rollout to internal-only, then disable beta/GA flags if customer impact persists.
- **Recovery:** replay dead-lettered verification-related events, confirm funnel recovery, then re-open rollout stage.

### 2) Provider outage / degraded provider dependencies

- **Detect:** webhook delivery failures, elevated pending checkout duration, provider API timeout/error spikes.
- **Triage:** verify provider status + local ingress health; compare catch-all webhook path vs domain endpoints.
- **Containment:** switch traffic to stable fallback checkout path; keep idempotent event capture enabled.
- **Recovery:** replay backlog from dead-letter queue, run reconciliation, and validate paid/pending parity before re-enabling rollout.

### 3) Reconciliation backlog growth

- **Detect:** backlog/health endpoints report retry due + dead-letter depth over threshold.
- **Triage:** identify dominant event family (`checkout`, `payment`, `invoice`, `subscription`) and root-cause pattern.
- **Containment:** pause rollout expansion and prioritize replay/reconcile workers.
- **Recovery:**
  1. execute targeted dead-letter replay batches,
  2. run `POST /api/v1/payment/usage/reconcile`,
  3. verify wallet timeline/subscription snapshot parity,
  4. close incident after backlog and parity return within SLO.

### Backward compatibility notes for existing API consumers (explicit)

- Existing consumers of startup/business payment APIs require no request/response schema changes for Link adoption.
- Existing integration points continue to receive stable fields; any new fields/metadata are additive and optional.
- Existing webhook consumers keep current contract semantics; no version bump required for this rollout.
- Existing fallback checkout remains operational for rollback and phased adoption safety.

## 2026-02-26 Relay-to-RunAshBook automation flow update

### 1) Relay -> RunAshBook automation flow and event lifecycle

- **Intent capture:** RunAshChat natural-language intents (for example, "buy this") are normalized by Relay into a tenant-scoped checkout command with deterministic correlation IDs.
- **Checkout start:** Relay creates the RunAsh AI Link checkout attempt and emits `relay.checkout.initiated` for downstream observability.
- **Gateway lifecycle:** payment events are consumed through idempotent webhook processing (`created`, `requires_action`, `succeeded`, `failed`) and mapped to the checkout attempt timeline.
- **Accounting handoff:** successful terminal checkout emits `runashbook.accounting.post.requested` to automate journal posting in RunAshBook.
- **Closure lifecycle:** RunAshBook responds with `runashbook.accounting.posted` or `runashbook.accounting.deferred`; checkout UX remains source-of-truth on payment state while accounting state is tracked as downstream automation.

### 2) Backward compatibility statement

- Existing startup/business payment API signatures and field names are preserved.
- Any Relay-to-RunAshBook data extensions are additive and optional.
- No migration or API version bump is required for current integrations.

### 3) Risk and rollback plan

- **Risk focus:** RunAshBook accounting posting failures can create finance-operation lag without affecting payment authorization.
- **Rollback procedure:** set `FEATURE_FLAG_RUNASHBOOK_ACCOUNTING_POSTING=0` to stop accounting posting while preserving checkout, payment capture, and webhook reconciliation.
- **Operational safeguard:** keep existing checkout fallback active and replay accounting events after remediation.

### 4) Security note (logs and accounting payloads)

- Sensitive payment/auth content is not logged (no full card data, secrets, OTP payloads, auth credentials, or raw tokens).
- RunAshBook payloads include only minimum accounting-safe fields (masked references, IDs, amounts, currencies, timestamps, reconciliation keys).
- Redaction rules remain mandatory for all payment and auth telemetry.

### 5) Validation checklist/results format

Capture release validation in this structure:

```md
Validation checklist (Relay -> RunAshBook)
- [ ] npm run lint
- [ ] npm run build
- [ ] Integration: Relay intent -> Link checkout -> payment success
- [ ] Integration: payment success -> RunAshBook posting event emitted
- [ ] Integration: FEATURE_FLAG_RUNASHBOOK_ACCOUNTING_POSTING=0 keeps checkout healthy
- [ ] Integration: accounting failure path does not alter payment final state

Results
- lint: <pass|fail> (notes)
- build: <pass|fail> (notes)
- integration-relay-checkout-success: <pass|fail> (notes)
- integration-runashbook-posting: <pass|fail> (notes)
- integration-flag-off-checkout-continuity: <pass|fail> (notes)
- integration-accounting-failure-isolation: <pass|fail> (notes)
```

## 2026-02-26 Relay commerce adapter hardening (catalog/inventory/preview)

- Replaced hardcoded Relay tool implementations for `catalog_lookup`, `inventory_health`, and `checkout_preview` with provider-backed service adapters.
- Tool routing now goes through `relayAgentSkillModules` for these operations, ensuring deterministic orchestration and consistent typed payloads.
- Checkout preview responses now include source-of-truth identifiers (`quote_id`/`preview_id`), while catalog + inventory include auditable identifiers (`sku`, `inventory_location_id`, `inventory_snapshot_id`) for downstream checkout and accounting traces.
- Timeout/retry/throttle behavior in the orchestration layer remains unchanged; only tool execution backend wiring changed.

### Risks and rollback

- **Primary risk:** repository-backed product catalog may be unavailable in local/dev environments without database connectivity.
- **Mitigation:** adapters retain safe fallback to local in-memory product seed data to preserve non-prod behavior.
- **Rollback:** revert adapter wiring in `lib/skills/relay-tool-registry.ts` and orchestration map in `services/agent-orchestration-service.ts` to prior implementation if regression is detected.

## Negotiation Reliability Addendum (2026-02)

This release introduces policy-driven deal negotiation before payment handoff:

1. **Initial quote** creates deterministic `deal_id` values from stable negotiation context.
2. **Counter-offers** support expiration and automatic accept/reject thresholds from `discount_policies`.
3. **Broker settlements** finalize outlier negotiations within policy floor/ceiling controls.
4. **Payment handoff** to AI Link consumes accepted deal snapshots before checkout initiation.

### Risk / Rollback
- **Risk:** misconfigured discount policy thresholds could over-accept or over-reject offers.
- **Mitigation:** policies are tenant+SKU scoped and auditable through `deal_events` and `offers`.
- **Rollback:** disable negotiation tool invocation and continue direct checkout path (`initiate_link_checkout` without `deal_id`).

## 2026-02-26 Voice commerce orchestration release note

- Voice commerce orchestration now supports end-to-end conversion from spoken buyer intent to Link checkout handoff inside RunAshChat.
- Intermediate automation events are persisted per stream session for compliance replay and operational forensics.
- Seller-side AI automation controls now include promotion triggers (bundle + limited-time discount) and approved-deal launch workflows with broker mediation.

Business controls preserved:
- Existing payment contracts remain additive and backward compatible.
- Sensitive payment/auth data is not introduced into logs/event payloads.
- Checkout finalization still requires explicit confirmation pathing in checkout skill gates.

## 2026-02-27 Editor render worker reliability note (non-payment)

- Added dedicated editor render queue worker orchestration (`editor_render_jobs`) in service-layer code.
- **Payment/auth impact:** none. Payment API contracts, checkout state machine, and auth/session semantics are unchanged.
- **Security posture:** worker error persistence remains sanitized and excludes secrets/tokens.

### Risk / rollback
- **Risk:** render queue may accumulate if model/storage dependencies are unavailable.
- **Mitigation:** bounded retries with attempt tracking and non-sensitive error persistence in job result metadata.
- **Rollback:** disable the worker invocation/scheduler and continue queue-only behavior while preserving enqueue/list APIs.

## 2026-02 marketing route alias note (non-contract)

- Public navigation aliases now map `/payment/business` -> `/enterprises` and `/payment/startup` -> `/partner` to align top-level marketing information architecture.
- This is a presentation-layer route alias only; startup/business payment API signatures, payment field names, checkout contracts, and webhook contracts remain unchanged.
- Rollback: remove redirect aliases in `next.config.mjs` to restore legacy public URL paths without touching payment execution logic.

## 2026-02-27 Editor render API hardening note (non-payment)

- Hardened editor render-job APIs with per-user/project throttling plus active-queue quotas to protect shared infrastructure.
- Added enqueue policy gates for max duration, max resolution, and model-tier allowlist checks before jobs enter queue processing.
- Added explicit cancellation propagation in worker stages to prevent expensive post-cancel processing and stale result writeback.
- **Payment/auth impact:** none. Checkout contracts, payment fields, and auth session handling are unchanged.

### Risk / rollback
- **Risk:** stricter quotas can reject bursts for high-volume creator workflows.
- **Mitigation:** all limits are environment-configurable and surfaced with stable API error codes.
- **Rollback:** relax or disable quota/policy env limits while preserving API shape and worker behavior.

## 2026-02 Seller marketing workflow automation note (non-payment)

- Added seller marketing workflow orchestration for trigger-based campaigns (`stream_ended`, `cart_abandoned`, `high_intent_viewer`, `repeat_buyer`) with multi-channel delivery routing.
- Added campaign persistence tables for templates, rules, and run history to support auditability and replay.
- **Payment/auth impact:** none. Checkout contracts, payment field names, and auth/session interfaces remain unchanged.

### Risk / rollback
- **Risk:** high-volume trigger traffic could generate excessive outbound notifications.
- **Mitigation:** rule activation controls, trigger condition gates, and run history observability are included for controlled rollout.
- **Rollback:** deactivate affected marketing workflows via activation API or remove the new seller marketing tab while preserving existing seller operations.


## 2026-03 auth/session tenant consistency linkage

### Impacted payment/auth flows
- Authenticated merchant/operator session resolution for payment-adjacent routes now benefits from tenant-indexed auth session lookups (`auth_session_registry.organization_id`).
- Trusted-device/session-security controls used by payment-sensitive actions continue using unchanged API contracts; persistence is hardened with tenant backfill/indexing.

### Compatibility + risk
- Payment API contracts, field names, webhook payloads, and checkout route signatures are unchanged.
- Migration is additive; risk is limited to migration runtime/index creation overhead on large auth-session tables.

### Rollback strategy
1. Application rollback is preferred; no payment contract rollback is required.
2. If DB rollback is required, remove only newly added indexes first, then `organization_id` columns after controlled maintenance window.
3. Re-run payment authorization smoke checks after rollback before re-enabling rollout flags.

## 2026-03 realtime gateway rollout note (non-payment change)

- Change scope: unified realtime gateway for editor/live-stream channels (`editor:{projectId}`, `stream:{sessionId}`) with typed event schemas and cursor-based resume.
- Payment/auth impact assessment: no payment field names, checkout contracts, or billing API signatures were modified.
- Risk + rollback: operational risk limited to editor/live-stream update propagation; rollback by disabling realtime subscriber usage and reverting to prior polling/SSE route.
- Security posture: realtime handshake uses existing authenticated user/session identity with per-resource authorization; no sensitive payment/auth payloads are logged.

## 2026-03 editor render orchestration pipeline upgrade (non-payment contract change)

- Scope: introduced resilient render orchestration state machine in `services/editor` with explicit statuses (`queued|processing|retrying|completed|failed|canceled`), persisted attempt counters, provider traces, cancellation tokens, and retry scheduling metadata.
- Added dead-letter persistence for terminal render failures plus admin replay endpoint to requeue failed jobs.
- Added API coverage for user-initiated cancel, retry, and timeline/history retrieval for render jobs.
- Data integrity update: completion now persists normalized provider output + output-publication metadata with transactional job/asset updates to reduce split-brain writes.
- Payment/auth impact: none; no payment contract or auth API signature changed.
- Risk + rollback: moderate operational risk in queue worker behavior. Rollback by reverting `services/editor/render-worker.ts`, new render-job APIs, and migration `scripts/sql/2026-03-06_editor_render_job_orchestration.sql`; existing queued jobs continue under prior worker semantics after rollback.

## 2026-03 checkout method + GST capture enhancement

### Impacted payment/auth flows
- Checkout UI now supports explicit `card | upi` payment-method selection and forwards this as additive payload metadata to `POST /api/v1/billing/checkout`.
- Checkout business purchase mode captures GST invoicing fields (`business_name`, `gst_number`, `tax_jurisdiction`) under additive `business_tax` payload shape.
- Existing required checkout fields and API signatures remain backward compatible; new fields are optional and ignored by older clients.

### Compatibility + security
- Preserved existing checkout contract field names (`priceId`, `mode`, `success_url`, `cancel_url`, `billing_address`) without renaming/version break.
- Added optional schema support on billing checkout route for `payment_method` and `business_tax` only.
- Sensitive GST identifiers are not emitted into audit logs/accounting metadata; only business-purchase boolean + jurisdiction classification are captured for routing/accounting observability.

### Risk / rollback
- **Risk:** Misconfigured price ID or unavailable billing route can fail direct checkout-session bootstrap from checkout UI.
- **Mitigation:** UI falls back to existing payment workspace routing when checkout session creation fails.
- **Rollback:** Revert checkout-page direct billing call path and schema additions in `app/api/v1/billing/checkout/route.ts`; legacy payment workspace flow remains intact.
