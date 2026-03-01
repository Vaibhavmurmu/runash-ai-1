# 🏦 RunAsh AI Pay

_Last verified: 2026-02-24 (UTC)_

This document is payment-domain specific. For contributor workflow/process policy, use `docs/CONTRIBUTOR_POLICY_INDEX.md`, `TEAM_GUIDE.md`, and `docs/DOC_GOVERNANCE.md`.

## Canonical payment contract posture

- Preserve existing payment API request/response field names and signatures unless an explicitly versioned migration is published.
- Preserve webhook contract compatibility; any contract change must include migration notes and rollback guidance.
- Keep payment/auth sensitive values out of logs and telemetry.
- Maintain auditability for payment-impacting behavior changes.

## Current payment reliability notes (2026-02)

- RunAsh Chat payment-adjacent actions route through existing settings action APIs:
  - `POST /api/settings/actions/credits-balance`
  - `POST /api/settings/actions/refer-earn`
  - `POST /api/settings/actions/upgrade-plan`
- Project create/import flows initialize with `POST /api/editor/projects` before editor/payment handoff.
- Credits purchase routing uses `/pricing?intent=credits`; redeem flow uses in-app validated redeem input before billing handoff.
- Payment API contract fields, webhook schemas, and auth/payment token formats remain unchanged by these routing updates.

## 2026-02 Ecommerce payments theme/UI refactor (no contract changes)

- Updated `/ecommerce/payments` presentation layer to use semantic theme tokens (`bg-background`, `text-foreground`, `border-border`, `muted-foreground`) and shared design-system inputs/select/textarea components.
- Payment API request/response contracts, webhook schemas, and payment/auth field names remain unchanged.
- Risk + rollback: low runtime risk (UI-only). If visual regressions are observed, revert `app/ecommerce/payments/page.tsx` to restore prior styling without data or contract rollback.

## 2026-02 validation-only reliability check (no contract changes)

- **Change type:** validation-only pass; no payment runtime behavior, API signature, webhook schema, or field-name changes were introduced.
- **Impacted payment/auth flows reviewed:**
  - Checkout entry via `/pricing?intent=credits`
  - Settings action payment-adjacent APIs (`credits-balance`, `refer-earn`, `upgrade-plan`)
  - Auth-gated payment access via Better Auth session validation (`/api/auth/get-session`)
- **Risk assessment:** low product risk because this update is documentation + validation only; primary operational risk is CI/local build interruption when database environment variables are absent.
- **Rollback plan:** revert this documentation commit if needed; no data migration, no API rollback, and no payment contract rollback required.

## 2026-02-28 validation run (dependency/environment constrained)

- **Behavior change summary:** no payment/auth runtime behavior changes and no contract/schema changes.
- **Validation commands + outcomes:**
  - `npm run lint` -> failed because ESLint is not installed in the current dependency state (`ESLint must be installed`).
  - `npm run build` -> compilation succeeded, then build failed while collecting page data because database connection env was missing (`No database connection string was provided to neon()`).
- **Impacted payment/auth flows reviewed:**
  - Auth-gated payment access checks (`/api/auth/get-session`)
  - Credits checkout entry handoff (`/pricing?intent=credits`)
  - Settings payment-adjacent action endpoints (`/api/settings/actions/credits-balance`, `/api/settings/actions/refer-earn`, `/api/settings/actions/upgrade-plan`)
- **Risk + rollback:** operational release risk is environment readiness (missing lint dependency + DB env), not payment contract behavior. Rollback is documentation-only revert; no payment data migration or API rollback required.

## 2026-02-28 auth verification routing consistency (no payment contract changes)

- Better Auth email verification remains canonical for auth-gated payment surfaces; signup + resend verification now consistently use Better Auth verification dispatch and the canonical verifier endpoint (`/api/auth/verify-email`).
- No payment API request/response fields, billing webhook contracts, checkout signatures, or auth/payment token formats were changed.
- Risk + rollback: low runtime risk (auth UX/message + resend consistency only). Rollback is app-level revert of auth verification routing/UI updates; no payment migration or contract rollback needed.

## Auth dependency notes for payment flows

- OTP email login verification now mints canonical auth sessions and secure Better Auth cookies for `purpose=login`; non-login OTP purposes remain verification-only.
- This auth-session alignment does not change payment API contracts, webhook payloads, or billing field names.
- Payment-linked auth messaging uses the canonical provider module (`lib/email-provider.ts`) and deterministic provider selection (`EMAIL_PROVIDER=smtp|resend`).
- Protected payment flows rely on Better Auth session validation via `/api/auth/get-session` and canonical Better Auth session cookies.
- Better Auth signup verification emails now always resolve to the canonical verification endpoint (`/api/auth/verify-email`) and use safety-aware auth email delivery utilities (`lib/email.ts` -> `lib/email-provider.ts`) to preserve secure, auditable routing.
- Legacy NextAuth cookie compatibility remains temporary during migration windows to avoid lockouts.
- RBAC authorization remains aligned with canonical `viewer` / `operator` / `admin` capabilities with compatibility mapping where still required.
- Middleware and seller/admin route guards enforce role-aware authorization server-side with explicit `401 Unauthorized` (missing session) and `403 Forbidden` (insufficient role) behavior for payment/auth-adjacent surfaces.

## Payment surface routes (current)

- Dashboard: `/dashboard/payments`
- Checkout entry points: `/checkout/*`
- Billing surfaces: `/pricing`, `/settings/billing`
- Customer portal surfaces: `/portal/*`

## Safety + rollback expectations for payment-impacting updates

- Roll back immediately if payment authorization anomalies, checkout failures, or webhook processing regressions are observed.
- Use staged rollout for auth-dependent payment changes and verify metrics before advancing rollout percentage.
- Record payment-impacting changes in PR risk notes and in this document.

## Checkout redirect orchestration contract

- Billing checkout APIs return and persist redirect orchestration fields: `redirectUrl`, `returnUrlSuccess`, `returnUrlPending`, `returnUrlFailed`, and `providerTransactionReference`.
- Redirect callbacks must include signed `state` plus provider reference so the callback endpoint can validate integrity before resuming checkout state.
- Final status resolution order: webhook-backed checkout attempt state first, provider session lookup second (fallback).
- Callback handlers must never trust query `status` without validating signed state/reference.

## Payment status surfaces and backend resolution

- Dedicated payment status pages exist at `/payment/status/[state]` where `state ∈ {success,error,incomplete,pending,complete}` for explicit status UX states.
- Status pages resolve from backend payment records using `GET /api/v1/payment/status` (and alias `GET /api/payment/status`), not query-string status text alone.
- Status resolution validates signed checkout return state/reference, then resolves status via persisted checkout attempts first and provider session lookup second.
- UI contract for status pages includes transaction summary values, checkout attempt/reference identifiers, and recommended user actions (retry, dashboard return, support, invoice download when available).

## 2026-02 invoice operations UX/API update

- Added first-party invoice workflows backed by existing billing APIs: list, create, detail, payment status, and receipt/download surfaces under `/payment/invoices`.
- `POST /api/v1/billing/invoices` now accepts validated customer + line-item + tax + due-date + currency payloads and persists invoice records and line items.
- Invoice records now persist customer details and invoice-linked payment attempts (`invoice_payment_attempts`) to improve auditability.
- Webhook payment events now append invoice payment attempts and synchronize invoice status (`open`/`paid`/`uncollectible`) + `amount_paid` in local invoice records when references match.

## 2026-02 Payment State Normalization & Reconciliation

- Normalized payment intent states now use a shared domain enum: `pending`, `processing`, `requires_action`, `succeeded`, `failed`, `canceled`, `expired`, and `incomplete`.
- Payment intent status updates are transition-validated in the service/repository layer to avoid invalid jumps and preserve backward-compatible API response shapes.
- Payment intent records now persist status transition timestamps (`status_transitions` + `last_status_transition_at`) for auditability.
- New reconciliation endpoint pattern is available at `POST /api/v1/payment/usage/reconcile` (and alias `/api/payment/usage/reconcile`) to:
  - recover payment intents from provider event mismatches,
  - expire stale checkout sessions and prevent stuck authorized/created sessions.
- Risk/rollback: if reconciliation behavior needs rollback, disable scheduled calls to the endpoint and revert to existing manual status updates while preserving the newly added transition metadata columns.

## 2026-02 Webhook + Callback Reliability hardening

- Stripe webhook intake enforces provider signature verification and idempotent event ingestion keyed by provider event id.
- Webhook replay now reuses the same processing claim path as live events and replays in provider-created order to reduce out-of-order side effects.
- Payment attempts now persist retry-safe dedupe keys and provider event timestamps in `invoice_payment_attempts`; invoice status synchronization reads the latest ordered attempt state.
- Internal billing webhook replay/rollback routes additionally accept signed service-to-service calls (`x-runash-timestamp` + `x-runash-signature`) to verify non-session automation callers.
- Checkout callback/payment resolution now prefers the unified invoice payment-attempt ledger (`invoice_payment_attempts`) before legacy checkout attempt records, keeping UI status surfaces consistent.

## 2026-02 Payment dashboard operations visibility refresh

- `/payment/dashboard` now renders an operations-focused dashboard surface instead of redirecting to legacy billing navigation.
- Customer-facing telemetry blocks include current balance/plan context, recent transactions, pending payment actions, and failed-payment recovery status.
- Operator panel cards now surface recent failures, webhook lag/error counters, refund/chargeback risk flags, and reconciliation health metrics for faster triage.
- No payment API request/response fields, webhook payload contracts, or auth/session signatures were changed by this UI refresh.
- Rollback plan: revert the dashboard page/component pair (`app/payment/dashboard/page.tsx` and `components/payment/payment-operations-dashboard.tsx`) to restore previous redirect behavior.



## 2026-02 RunAshBook dashboard compliance + automation telemetry

- Expanded `/payment/dashboard` operations UI with a **RunAshBook** section for accounting integration visibility.
- Added integration status card values for connection state, last sync timestamp, and jurisdiction mode (India/US/Both).
- Added compliance cards for India (GST filing readiness + pending GST-tagged transactions) and US (sales-tax classification completeness + uncategorized revenue events).
- Added agentic automation metrics for relay-triggered accounting posts, success/fail/retry counters, and unsynced queue size.
- Added RunAshBook actions (`Sync now`, `View journal queue`, `Export audit trail`) for finance/operator workflows.
- Backward compatibility: this is a UI-only enhancement and does not change payment/auth API signatures, payload field names, or persistence contracts.
- Security posture: no sensitive payment/auth secrets are rendered; displayed values are aggregate operational metrics only.
- Rollback plan: revert `components/payment/payment-operations-dashboard.tsx` and this section to restore the previous dashboard layout.

## 2026-02 Payment automation trigger/action mappings

- Workflow automation now supports payment webhook trigger events:
  - `payment_succeeded`
  - `payment_failed`
  - `invoice_overdue`
  - `checkout_abandoned`
- Payment trigger-to-action mappings are available in workflow templates and node handlers:
  - `payment_succeeded` → `payment.send_receipt`, `payment.unlock_feature_entitlement`
  - `payment_failed` → `payment.notify_support`
  - `invoice_overdue` → `payment.retry_reminder`
  - `checkout_abandoned` → `payment.retry_reminder`
- Actions execute through the existing workflow automation engine and emit queue-oriented metadata (`queue: automation`, `queued`, `jobId`) for worker handoff where queue workers are enabled.
- Backward compatibility: existing payment API signatures, webhook contracts, and billing field names are unchanged.
- Rollback plan: remove payment workflow node/template references in `lib/workflow-kit/*` and revert to pre-payment trigger workflow configurations.

## 2026-02 payment reliability test coverage expansion

- Added targeted automated coverage for checkout redirect callback status mapping, payment status route-state mapping, invoice create total calculation lifecycle, webhook duplicate idempotency classification, and failed/incomplete retry lifecycle behavior.
- Backward compatibility: no payment API field names, webhook payload fields, or billing endpoint signatures were changed; test-focused helper modules mirror existing route/service behavior.
- Migration notes: no schema or contract migration required for this change set because logic is extracted to shared mappers/helpers without altering persisted formats.
- Risks:
  - Behavioral drift risk if helper mappers diverge from route/service call sites in future edits.
  - Build/lint environment dependency risk remains (missing local lint/build env secrets/deps can mask unrelated regressions).
- Rollback steps:
  1. Revert helper module imports in payment routes/services to prior inline logic.
  2. Revert added helper modules/tests (`lib/payments/*mappers*`, `lib/services/billing-webhook-idempotency.ts`, `lib/billing/invoice-calculations.ts`, and corresponding `*.test.ts` files).
  3. Re-run payment route tests and deploy previous known-good commit if mapping regression is confirmed.

## 2026-02 Scan & Pay UPI lifecycle confirmation hardening

- The `/scan` payment UX now persists `transactionId` after initiation and models lifecycle states as `initiated` → `pending` → (`success` | `failed`) with timeout handling.
- Client flow no longer transitions directly to success after initiation; it polls `GET /api/upi/status/[transactionId]` and only renders success UI when backend status is confirmed `success`.
- Failed and timeout states now render explicit recovery UI (retry status check / return to RunAsh Pay) without changing payment contract field names.
- Success rendering includes provider-facing `transactionReference` and `updatedAt` confirmation timestamp returned from the status API.
- Risk/rollback:
  1. If confirmation polling causes UX regressions, revert `app/scan/page.tsx` and restore previous route behavior.
  2. If status endpoint behavior is unstable, roll back `app/api/upi/status/[transactionId]/route.ts` and gate Scan & Pay launch behind existing stable payment surfaces.

## 2026-02 UPI backend PIN validation, rate-limits, and idempotency hardening

- `POST /api/upi/initiate` and `POST /api/upi/confirm` now accept/reuse idempotency keys (header `idempotency-key` or body `idempotencyKey`) to prevent duplicate initiation/confirmation charging behavior under retries.
- UPI PIN validation now executes only on backend confirmation (`/api/upi/confirm`) and no longer depends on client-side PIN length assumptions.
- Payment routes now enforce request rate limits and PIN retry limits. Exhausted retries return `PIN_ATTEMPTS_EXCEEDED`; route-level risk controls return `RISK_BLOCKED`.
- UPI confirmation and status APIs now expose structured error codes (`INVALID_PIN`, `PIN_ATTEMPTS_EXCEEDED`, `RISK_BLOCKED`) to support deterministic UI messaging without exposing provider internals.
- Logging hardening expands payment log sanitization to redact PIN/auth-like fields (`pin`, `otp`, `token`, `authorization`, `secret`) so raw credentials never reach app logs.
- Risks + rollback:
  1. In-memory idempotency/rate-limit state resets on process restart; if this causes inconsistent behavior, replace store with Redis/DB-backed state before high-scale rollout.
  2. If new confirmation API introduces regressions, rollback by reverting `app/api/upi/confirm/route.ts`, `lib/services/upi-checkout-service.ts`, and `app/scan/page.tsx` together to keep client/server flow aligned.
  3. Keep API contracts backward-compatible by preserving existing payload fields (`transactionId`, `status`, `transactionReference`, `updatedAt`) while additive fields (`errorCode`) remain optional.

## 2026-02 RunAshChat Instant Checkout (Relay → Link)

- Added/confirmed `initiate_link_checkout` tool contract for RunAshChat relay with required fields: `merchant_id`, `amount` (smallest unit), `currency` (`INR`/`USD`), and `product_metadata` (`item_name`, `sku`, `tags` including `via RunAshChat`).
- Relay chat routing now auto-selects payment tooling for natural-language intents such as `buy this` and `confirm`, while preserving explicit caller-provided tool lists for backward compatibility.
- Link execution path now calls `https://api.runash.in/v3/pay` and emits structured execution activity summary metadata including request correlation ID, endpoint, attempt count, and fallback usage.
- RunAshChat UI now surfaces checkout state (`idle` / `processing` / `success` / `failed`) and request correlation ID to improve support/audit workflows.
- Added explicit tax estimation utility support to compute and expose subtotal, GST/VAT amount, and total payable before payment confirmation; step-3 confirmation UI now requires explicit post-preview user confirmation before charge execution.
- Payment execution service now enforces primary-method-first execution with automatic backup-method retry only for retryable failures, and persists both attempts with reason/status in transaction metadata for auditability.
- Receipt/audit payloads now include fallback metadata (`fallbackUsed`, `attemptedMethods`) in addition to existing snake_case fields for backward-compatible display across RunAshChat and operational reporting.
- Risks + rollback:
  1. Intent over-matching could trigger checkout tooling for ambiguous prompts; rollback by reverting intent selection helper in `app/api/agents/chat/chat-request-handler.ts`.
  2. If upstream `/v3/pay` payload/response behavior changes, rollback to prior `runLinkCheckoutWithFallback` return mapping while preserving request headers and idempotency behavior.
  3. UI state inconsistencies can be rolled back by reverting `components/chat/link-quick-pay-button.tsx` + `components/dashboard/workspace/chat-workspace.tsx` together to keep metadata/state mapping aligned.


## 2026-02 Validator middleware hardening for execution path

- Added currency-normalized policy evaluation in payment validator middleware with explicit thresholds: HITL required when amount exceeds USD-equivalent $100 (`RUNASH_HITL_THRESHOLD_USD_CENTS`, default `10000`) and MFA required when amount exceeds INR-equivalent ₹8,000 (`RUNASH_MFA_THRESHOLD_INR_PAISE`, default `800000`).
- Enforced validator middleware before both payment intent creation and payment confirmation/execution paths so blocked decisions are returned prior to charge confirmation.
- Validator decision contract is propagated to callers with stable fields: `requiresHitl`, `requiresMfa`, `allowed`, and `reasonCodes` (plus existing snake_case compatibility fields internally).
- Payment/auth activity log payloads now mask payment identifiers (e.g., `*4242`) for keys like `paymentMethodId`, `intentId`, and provider transaction identifiers, while continuing to redact PIN/OTP/CVV style secrets.
- Risks + rollback:
  1. **Risk:** Strict execution-time gate could block legacy intents missing `human_confirmed`/`mfa_verified`. **Mitigation:** confirm route accepts override flags and metadata now persists both fields at create-intent time.
  2. **Rollback:** Revert validator check insertion in `app/api/v1/payment/confirm/route.ts` and `lib/payment-service.ts`, then redeploy previous stable build if false positives are observed.
  3. **Compatibility:** Existing API signatures remain backward compatible; added fields are additive in successful and blocked responses.


## 2026-02 payment routing residency policy update (India/US)

- Added centralized payment routing policy module (`lib/payments/edge-routing-policy.ts`) to deterministically choose `IN_EDGE` vs `US_EDGE` based on merchant/customer region context.
- Routing context metadata now includes `region`, `residencyPolicyVersion`, and `requestId`; these fields are attached to transaction context and provider metadata in compliance-safe form.
- Outbound provider metadata is minimized to required operational fields and routing context only; sensitive auth/payment details remain redacted via payment logging sanitization.
- Routing decision audits now persist request-scoped records with route decision + sanitized metadata only (no PAN/CVV/PIN/payment secrets).
- Operational note: if routing anomalies occur, rollback by reverting routing-context metadata builder usage in checkout/subscription/create-intent handlers while keeping API response contracts unchanged.

## 2026-02 Scan & Pay UX resiliency + receipt data wiring

- `/scan` now includes explicit component-level UX surfaces for `pending`, `failed`, and `retry` states (including timeout-retry status sync) to reduce ambiguous in-flight payment states.
- Added explicit user-controlled cancel/back actions from amount entry and PIN confirmation steps so users can safely exit or revise flow state without forcing hidden resets.
- In-flight transaction continuity is now persisted on the client (`transactionId` + current lifecycle status + step) so refresh/navigation does not drop active payment context.
- Per-action loading locks are enforced for initiate, confirm, status retry, share receipt, and download actions to prevent duplicate submissions.
- Receipt actions now resolve live transaction details from `GET /api/upi/transactions/[transactionId]`; “Share Receipt” uses fetched receipt data and “Download transaction details” exports real transaction payload JSON.

Risk and rollback notes:
1. If local storage persistence causes stale states in user sessions, rollback persistence in `app/scan/page.tsx` while retaining backend transaction contracts.
2. If receipt endpoint integration causes regressions, rollback `app/api/upi/transactions/[transactionId]/route.ts` and disable share/download controls while preserving UPI confirm/status behavior.


## Send Money Reliability Hardening (UPI)

RunAsh Pay send-money flows now follow an explicit lifecycle to reduce false-positive success states:

- Initiate payment (`/api/upi/initiate`) with idempotency keys.
- Confirm payment (`/api/upi/confirm`) with server-side PIN validation and risk controls.
- Poll final status (`/api/upi/status/:transactionId`) before rendering success UI.

### UX behavior update
- Success screen is shown only after terminal `success` status.
- Failed and timeout outcomes are surfaced with retry actions.
- Transaction reference and details endpoints are exposed for reconciliation.

This change preserves API compatibility while improving operational correctness for payment status handling.



## 2026-02 Custom Wallet + Link autofill integration

- Added custom wallet APIs and pages for card vaulting, activity timeline, and subscription management:
  - `GET/POST /api/wallet/cards`, `PATCH/DELETE /api/wallet/cards/:id`
  - `GET /api/wallet/activity`
  - `GET/PATCH /api/wallet/subscriptions`
  - pages: `/wallet`, `/wallet/activity`, `/wallet/subscriptions`
- Added Link UX flows aligned to RunAshChat checkout behavior:
  1. Save payment info at checkout (`POST /api/wallet/link/save`).
  2. Account verification with one-time code for new device/site (`POST /api/wallet/link/session`, `POST /api/wallet/link/verify`).
  3. Checkout autofill preview after verification (saved email + masked payment method + billing details).
- Security and compatibility notes:
  - Card payloads are reduced to masked last4 storage in wallet records and never expose full PAN in API responses.
  - Existing payment API signatures remain unchanged; wallet/link routes are additive and can be rolled back independently.


## 2026-02 Link wallet persistence hardening (Instant Checkout)

- Replaced in-memory wallet/link state maps with PostgreSQL-backed repositories for cards, link sessions, activity logs, subscription snapshots, and OTP verification attempts.
- Card persistence stores only tokenized payment references and masked metadata (`brand`, `last4`, `expMonth`, `expYear`); full PAN is never persisted.
- Link verification codes are stored as hashes; OTP verification attempts are captured for auditability and abuse monitoring.
- Sensitive wallet profile fields are encrypted at rest with envelope metadata (`kid`, `iv`, `tag`, `data`) and key-ring based decrypt fallback to support key rotation.
- Backfill strategy for existing seeded demo flow is published in `scripts/sql/2026-02-26_backfill_wallet_demo_data.sql` and is idempotent.

Risks + rollback:
1. **Risk:** key-ring misconfiguration can block decryption of existing encrypted profile fields. **Mitigation:** key-ring fallback decrypt and lazy re-encryption on read.
2. **Rollback:** revert wallet repository migration and switch API handlers back to prior in-memory store while preserving API signatures.
3. **Compatibility:** wallet API request/response field names remain unchanged for existing clients.

## 2026-02 Link provider service hardening (Stripe Link)

- Wallet Link APIs now route through a dedicated provider service (`lib/services/link-provider-service.ts`) that wraps Stripe Link-capable setup/session primitives for:
  - session bootstrap (`/api/wallet/link/session`)
  - verification status lookup (`/api/wallet/link/verify`)
  - payment method save (`/api/wallet/link/save`)
- API envelope compatibility is preserved (`success`, `data`, `error`, `requestId`) and legacy response fields remain additive.
- Provider request identifiers are captured and returned for audit/support workflows via `providerRequestId`.
- Verification status now supports webhook-driven state updates from Stripe SetupIntent events (`setup_intent.succeeded|setup_failed|canceled`) via `/api/billing/webhook` and persisted session status.
- Error mapping now emits stable payment-safe error codes with user-safe messages:
  - `LINK_SESSION_FAILED`
  - `LINK_VERIFICATION_FAILED`
  - `LINK_SAVE_FAILED`
  - `LINK_PROVIDER_UNAVAILABLE`

Risks + rollback:
1. If Stripe SDK/credentials are unavailable in a non-prod environment, provider service falls back to deterministic mock IDs to keep local UX paths testable.
2. If webhook event mapping causes false verification transitions, rollback by reverting wallet-link sync logic in `app/api/billing/webhook/route.ts` while preserving existing billing webhook processing.
3. No breaking API contract changes were introduced; rollback is code revert only (no schema migration required for compatibility due to additive columns).

## 2026-02 Relay Instant Checkout hardening (RunAshChat → Stripe Link)

- `initiate_link_checkout` in relay tool registry now enforces validator middleware before tool execution, ensuring checkout calls are blocked before provider execution when HITL/MFA policy fails.
- Added deterministic handoff contract generation from chat context (`session_id`, normalized user intent), merchant metadata, and product metadata so checkout session creation is stable across retries.
- Chat activity payload now includes UI-safe structured fields for rendering instant checkout state:
  - `checkoutId`
  - `status`
  - `nextAction`
  - `requestId`
- Retry behavior uses per-intent deterministic idempotency keys to prevent duplicate checkout sessions across retries and reconnect flows.
- Intent routing coverage expanded for phrases: `buy this`, `confirm purchase`, and `pay now` to ensure consistent `catalog_lookup -> initiate_link_checkout` path selection.

Risks + rollback:
1. **Risk:** deterministic idempotency keys may over-deduplicate if upstream intent normalization is too broad. **Mitigation:** key includes session and normalized intent digest.
2. **Rollback:** revert relay handoff contract generation and registry middleware wrapper in a single commit; API signatures remain backward compatible.
3. **Compatibility:** existing payload fields remain additive; no breaking changes to payment contract field names.


## Link Checkout Reliability + Audit Controls

- Link checkout now enforces validator threshold controls for HITL and MFA before provider session creation.
- Wallet default payment method updates and subscription lifecycle transitions are treated as high-risk payment actions and require HITL + MFA.
- Risk engine decisioning includes geo mismatch review, risk-score review/block thresholds, and block-signal deny rules with explicit reason codes.
- Payment-impacting wallet/link transitions emit structured audit logs with sanitized metadata for compliance review and rollback tracing.

## 2026-02 Wallet lifecycle + subscription reliability operations

- Added card lifecycle operations with ownership-aware repository checks:
  - add/remove cards and lifecycle updates (disable/enable, set default, set backup)
  - non-owner card IDs return not-found under scoped user queries, preventing cross-user mutation.
- Extended subscription operations to support reliability workflows:
  - plan changes
  - pause/cancel/reactivate transitions with reason capture
  - persisted subscription timeline events for auditability.
- Added activity + transaction reporting with downloadable CSV exports and reconciliation fields:
  - `/api/wallet/activity` now supports `limit`, `offset`, `search`, `type`, and `format=csv`.
  - `/api/wallet/transactions` provides paged/searchable transaction views with `reconciliationRef` and `settlementDate` plus `format=csv` export.
- Wallet UX now includes failed-renewal recovery:
  - simulate failed renewal state
  - fallback retry via designated backup card by promoting backup to default.

Risks + rollback:
1. **Risk:** lifecycle flags (`is_backup`, `is_disabled`) may be absent on older DB states. **Mitigation:** additive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migration-at-runtime handling.
2. **Risk:** aggressive fallback promotion could switch default method unexpectedly if UI misuse occurs. **Mitigation:** explicit operator action and visible card badges.
3. **Rollback:** revert wallet lifecycle route/UI changes and retain existing card add/remove/default behavior; additive schema remains backward-compatible.

## 2026-02 Webhook domain endpoints + replay-safe reconciliation hardening

- Added dedicated Stripe-signed webhook endpoints for domain routing:
  - `POST /api/billing/webhook/checkout` (`checkout.session.*`)
  - `POST /api/billing/webhook/session` (`setup_intent.*`)
  - `POST /api/billing/webhook/payment` (`payment_intent.*`, `invoice.*`, `charge.*`)
  - `POST /api/billing/webhook/subscription` (`customer.subscription.*`)
  - Existing `POST /api/billing/webhook` remains backward compatible as the catch-all endpoint.
- Event processing remains idempotent through `webhook_events` (`provider + event_id` uniqueness), claim-based processing transitions, exponential retry scheduling, and dead-letter promotion once retry threshold is reached.
- Added dead-letter operations workflow:
  - `GET /api/internal/billing/webhook/dead-letter` to inspect failed events.
  - `POST /api/internal/billing/webhook/dead-letter` with `{ eventId }` for targeted retry or `{ limit }` for batch replay.
- Async reconciliation now writes customer-facing wallet timeline records for checkout/payment/invoice/subscription lifecycle transitions and updates subscription snapshots where applicable.
- Reconciliation health metrics are exposed via:
  - `GET /api/internal/billing/webhook/health`
  - `GET /api/dashboard/operations/monitoring` under `reconciliation.webhook` for operator dashboards.
- Risk/rollback:
  1. If per-domain endpoint routing causes delivery mismatch, temporarily direct Stripe to `POST /api/billing/webhook` (catch-all) while preserving signatures.
  2. If timeline reconciliation introduces noisy events, disable wallet timeline writes by reverting `reconcileWalletTimeline` logic while retaining core billing ledger upserts.


## 2026-02 Link funnel observability + callback validation hardening

- Standardized wallet Link endpoints to the canonical API envelope (`success`, `data`, `error`, `requestId`, optional `meta`) without legacy top-level compatibility fields.
  - `POST /api/wallet/link/session`
  - `POST /api/wallet/link/verify`
  - `POST /api/wallet/link/save`
- Added strict schema validation (Zod) for every Link request payload above, plus Stripe setup-intent webhook callback payload parsing before wallet session status updates.
- Added funnel metrics emission for Link reliability tracking:
  - `session_created`
  - `session_verified`
  - `autofill_success`
  - `checkout_completion`
  - `fallback_usage`
- Added correlation/tracing propagation across Relay tool execution and provider/API calls:
  - relay tool execution lifecycle logs (`started`, `cache_hit`, `retry`, `completed`, `failed`)
  - provider session/save logs tied to request correlation IDs
  - upstream Link checkout call now forwards `x-correlation-id`.
- Exposed Link funnel health and alerting in operations monitoring payload under `payments.linkFunnel` with `errorRatePercent` and `alert` severity.
- Added operator dashboard tiles for Link funnel health and error-rate alerting.

Risks + rollback:
1. **Risk:** Removal of legacy top-level wallet/link fields can impact stale clients expecting direct `providerRequestId`. **Mitigation:** values remain available in `data` and envelope contract is now canonical; update any stale client mappers.
2. **Risk:** Strict payload schemas can reject malformed requests previously tolerated. **Mitigation:** explicit validation errors are returned with stable envelope error codes.
3. **Rollback:** revert Link observability module and wallet route payload parsing changes in one rollback commit; restore previous route handlers and dashboard tile blocks.

## 2026-02 RunAsh AI Link final architecture, data flow, and migration notes

### Final architecture (persistent + provider-backed)

- **RunAshChat intent plane:** user natural-language intents (for example, `buy this`) are converted by Relay Agent into typed checkout commands with idempotency keys.
- **Payment orchestration plane:** checkout commands are validated, enriched with tenant/session context, and routed to Link/session and billing services.
- **Provider execution plane:** Stripe Link + Checkout/Payment Intent APIs perform payer authentication and payment authorization/capture.
- **Durable state plane:** checkout attempts, link sessions, wallet artifacts, webhook events, dead-letter queue items, and reconciliation outcomes are persisted in DB.
- **Status resolution plane:** webhook-confirmed state remains source-of-truth; provider lookup is fallback for delayed webhook arrival.

### Data flow: RunAshChat "Instant Checkout"

1. User says `buy this` in RunAshChat.
2. Relay Agent resolves product/plan, amount/currency, merchant scope, and correlation/idempotency metadata.
3. Payment API creates checkout attempt and returns canonical redirect contract fields (`redirectUrl`, `returnUrlSuccess`, `returnUrlPending`, `returnUrlFailed`, `providerTransactionReference`).
4. User completes Link verification/auth flow and confirms payment.
5. Domain webhook endpoints validate provider signatures and process events idempotently.
6. Canonical payment status pages resolve from persisted attempt + webhook state, with provider lookup fallback.
7. Reconciliation jobs backfill drift/backlog and sync wallet activity + subscription snapshots.

### Migration: prototype to persistent/provider-backed implementation

- **Prototype mode (legacy):** in-memory Link/wallet session state for demos.
- **Target mode (current):** DB-backed repositories + provider-backed Link execution + replay-safe webhook pipeline.
- **Migration steps:**
  1. Apply `db/migrations/0002_wallet_link_persistence.sql`.
  2. Run `scripts/sql/2026-02-26_backfill_wallet_demo_data.sql` where demo continuity is required.
  3. Enable domain webhook handlers and dead-letter replay operations.
  4. Validate `POST /api/v1/payment/usage/reconcile` against pending/expired checkout cohorts.
- **Data protection controls:** tokenized payment references, masked card metadata only, hashed OTP artifacts, encrypted profile/billing metadata at rest.
- **Rollback (non-breaking):** disable Link rollout flags and revert repository wiring to in-memory fallback while preserving API request/response contracts.

### Backward compatibility notes for existing API consumers

- Existing startup/business API field names and signatures are preserved; no required client payload/schema migration.
- Existing webhook contracts remain compatible; newly introduced metadata is additive.
- Existing checkout redirect/status contracts remain valid; signed-state validation hardens integrity without renaming fields.
- Existing billing entry points (`/pricing`, `/settings/billing`, `/checkout/*`, `/portal/*`) remain stable through staged rollout.

## 2026-02 RunAshBook accounting posting module for payment lifecycle events

- Added `lib/services/runashbook-accounting-service.ts` to normalize accounting events from checkout + webhook payment lifecycle paths.
- Supported normalized event types: `checkout_initiated`, `payment_succeeded`, `refund`, `chargeback`, `fee`.
- Added deterministic chart-of-accounts mapping keyed by merchant country/entity with config-first defaults for `IN` and `US`.
- Jurisdiction adapters:
  - **India (IN):** GST split computation (`CGST`, `SGST`, `IGST`) + compliance metadata tags for invoice/journal processing.
  - **US:** sales-tax treatment metadata, ASC-606/GAAP-friendly recognition/account classification tags.
- Added idempotent accounting posting method (`idempotencyKey` + `correlationKey`) backed by `runash_accounting_posts` and unique idempotency enforcement.
- Added safe logging guardrails for accounting posting diagnostics using payment log sanitization (never logs PAN/card/auth/payment secrets).
- Wiring:
  - Checkout initiation path now emits `checkout_initiated` accounting events from `POST /api/v1/billing/checkout`.
  - Webhook processing emits accounting events for `payment_intent.succeeded`, `charge.refunded`, `charge.dispute.*`, and `application_fee.created` paths.

Risks + rollback:
1. **Risk:** If merchant country metadata is absent in provider payloads, fallback country default may classify to US chart mapping. **Mitigation:** metadata remains additive; override `RUNASH_MERCHANT_REGION` per tenant.
2. **Risk:** Accounting table bootstrap (`CREATE TABLE IF NOT EXISTS`) in runtime may add slight cold-path latency on first post. **Mitigation:** idempotent and one-time; can be moved to migration in future hardening.
3. **Rollback:** Revert accounting event emit calls in checkout/webhook handlers while preserving existing payment route API contracts and webhook idempotency behavior.

## 2026-02 Relay post-payment accounting sync for RunAshChat Instant Checkout

- Added post-payment accounting sync in Relay orchestration (`executeInitiateLinkCheckout`) so successful checkout confirmation and refund states trigger RunAshBook posting after checkout tool execution.
- Relay checkout handoff contract now includes accounting-required fields end-to-end:
  - merchant/entity + jurisdiction (`merchant_id`, `merchant_entity_id`, `merchant_country`)
  - monetary + tax/fee fields (`amount`, `currency`, `accounting_context.tax_breakdown`, `accounting_context.fee_breakdown`)
  - product/plan metadata (`accounting_context.product_plan_metadata`)
  - payment status + timestamp (`payment_status`, `event_timestamp`)
  - correlation + idempotency markers (`accounting_context.correlation_key`, `idempotency_key`)
- Exactly-once business semantics: Relay derives deterministic accounting idempotency keys using checkout idempotency key reuse (`<checkout-idempotency>:accounting:<eventType>`), so retries/duplicates collapse into single accounting effect.
- Failure fallback: if RunAshBook sync fails, Relay marks response with `pending_sync: true` and `accounting_sync.status: "pending_sync"`, emits internal ops reconciliation signal (`ops.accounting.reconcile_required` via structured warn log), and still returns successful checkout response to user.

Risks + rollback:
1. **Risk:** misconfigured merchant/entity metadata can route accounting entries to fallback defaults. **Mitigation:** deterministic defaults preserve continuity while preserving non-breaking API signatures.
2. **Risk:** transient accounting DB/service outages increase pending-sync backlog. **Mitigation:** explicit ops reconciliation signal and non-blocking checkout completion maintain user path reliability.
3. **Rollback:** remove Relay accounting sync call path while retaining checkout handoff fields and existing payment execution API contracts.

## 2026-02-26 Relay-to-RunAshBook automation flow update

### 1) Relay -> RunAshBook automation flow and event lifecycle

- **Intent capture:** RunAshChat captures natural-language checkout intent (for example, "buy this") and forwards it to Relay with tenant, user, and cart context.
- **Checkout orchestration:** Relay opens a RunAsh AI Link checkout attempt and emits `relay.checkout.initiated` with a stable `checkout_attempt_id`.
- **Payment processing:** Gateway lifecycle events (`payment_intent.created`, `payment_intent.requires_action`, `payment_intent.succeeded`, `payment_intent.failed`) are reconciled with webhook idempotency controls.
- **Accounting automation:** after terminal success, Relay emits `relay.checkout.completed` and posts an accounting-safe event envelope to RunAshBook (`runashbook.accounting.post.requested`) for journal creation.
- **Settlement + closure:** RunAshBook acknowledgement (`runashbook.accounting.posted` or `runashbook.accounting.deferred`) is correlated back to the checkout timeline without mutating customer-facing checkout status semantics.

### 2) Backward compatibility statement

- Existing payment API signatures and field names remain unchanged for startup/business consumers.
- Relay-to-RunAshBook automation introduces only additive internal events/metadata.
- No version bump is required for current payment API/webhook consumers.

### 3) Risk and rollback plan

- **Primary risk:** accounting posting latency/failure could delay financial journal visibility.
- **Rollback action:** disable accounting posting feature flag (`FEATURE_FLAG_RUNASHBOOK_ACCOUNTING_POSTING=0`) while preserving checkout, webhook ingestion, and payment status resolution.
- **Customer impact posture:** checkout continuity is preserved; only downstream accounting automation is paused until recovery.

### 4) Security note (logs + payload hygiene)

- Sensitive payment/auth data (PAN, full tokens, OTP secrets, session secrets, raw auth credentials) is excluded from logs.
- Accounting payloads sent to RunAshBook are restricted to non-sensitive identifiers, masked references, monetary totals, and reconciliation keys.
- Event/audit entries must store redacted metadata only, consistent with payment/auth security policy.

### 5) Validation checklist/results format

Use the following format in PRs and release notes:

```md
Validation checklist (Relay -> RunAshBook)
- [ ] npm run lint
- [ ] npm run build
- [ ] Integration: checkout success -> webhook reconcile -> RunAshBook post requested
- [ ] Integration: accounting-posting feature flag OFF preserves checkout completion
- [ ] Integration: failed accounting post does not regress payment status UX

Results
- lint: <pass|fail> (notes)
- build: <pass|fail> (notes)
- integration-checkout-accounting: <pass|fail> (notes)
- integration-flag-rollback: <pass|fail> (notes)
- integration-failure-isolation: <pass|fail> (notes)
```

## 2026-02 RunAshChat checkout handoff canonical context v2

- Refactored Relay handoff contract generation to consume canonical commerce/session context (`cartId`, `selectedSku`, merchant profile, pricing snapshot, billing profile) instead of deriving payload details from free-text alone.
- Added `lib/services/checkout-handoff-context-resolver.ts` to resolve merchant/account scope from authenticated session, SKU/amount from canonical selection inputs, billing currency/country, and tax/fee breakdowns via tax/payment service pathways.
- Backward compatibility is preserved: existing `merchant_id`, `product_metadata`, and `idempotency_key` are still accepted and propagated. New metadata keys are versioned under `context_version: "v2"` and `handoff_context_v2` for richer context without breaking existing consumers.

### Impacted flows
- RunAshChat Relay → `initiate_link_checkout`
- Accounting sync payloads consuming `accounting_context.tax_breakdown` / `fee_breakdown`

### Risks and rollback
1. **Risk:** canonical pricing inputs may be absent on legacy callers. **Mitigation:** resolver falls back to legacy-compatible defaults and deterministic digest identifiers.
2. **Risk:** service tax computation may be unavailable during infra outages. **Mitigation:** fallback tax model emits deterministic non-zero jurisdictional approximation for continuity.
3. **Rollback:** revert `chat-request-handler` + `checkout-handoff-context-resolver` changes; legacy `merchant_id`/`product_metadata`/idempotency behavior remains contract-compatible.

## 2026-02 Agent role orchestration audit trail for RunAshChat Link checkout

- Added role-aware agent orchestration controls for `buyer`, `seller`, and `broker` to gate tool access for payment-adjacent chat flows while preserving existing checkout API contracts.
- Role policies now carry objective weights (`price`, `sustainability`, `inventory urgency`, `margin`) and enforce guardrails (`max discount`, approval threshold, negotiation limit) during tool execution planning.
- Relay tool execution now emits role-tagged activity summaries for auditability and writes structured role decision outcomes (`allowed`/`blocked`/`completed`/`failed`) to persistent storage for post-hoc deal review and matching analysis.
- Migration added: `db/migrations/0004_agent_role_decisions.sql`.
- Risks + rollback:
  1. **Risk:** role misconfiguration could over-block tool usage for valid checkout intents. **Mitigation:** default fallback role remains `broker` and role policy checks return explicit blocked reasons.
  2. **Rollback:** revert role-conditioned execution path changes in `services/agent-orchestration-service.ts` and `lib/skills/relay-tool-registry.ts`, then keep migration table dormant (no contract break).
  3. **Compatibility:** all new request fields are additive (`agentRole`, `preferences`) and existing tool contracts remain backward compatible.

## 2026-02-26 Buyer product search ranking in Relay (additive, no checkout contract break)

- Added `buyer_product_search` Relay tool for pre-checkout intent handling (`find`, `compare`, `best under`) to improve recommendation explainability before `initiate_link_checkout` is triggered.
- Ranking now combines catalog data, sustainability attributes, normalized price in user currency, and stock availability; each result returns explicit reasons (`matched_budget`, `sustainability_score`, `tradeoffs`).
- Backward compatibility preserved: no existing payment request/response fields were removed or renamed; checkout tool contracts are unchanged.
- Risk + rollback:
  1. **Risk:** intent over-selection could call search tool for vague phrasing and increase chat latency.
  2. **Mitigation:** search tool remains immediate/read-only and does not execute payment operations.
  3. **Rollback:** revert `resolveRunAshChatToolSelection` mapping and remove `buyer_product_search` registration to restore prior catalog/web-search-only routing.


## Negotiation-to-Link Checkout Handoff (2026-02)

RunAsh AI Link now supports deterministic negotiation handoff before Link checkout initiation.

- Relay agents can create and settle negotiated deals through explicit tools: `create_initial_quote`, `submit_counter_offer`, and `broker_settle_deal`.
- Accepted deals persist a payment-safe snapshot (`deal_id`, `final_price_minor`, `discount_basis`, `sku`, `quantity`, `currency`).
- `initiate_link_checkout` consumes the accepted snapshot when `deal_id` is provided, ensuring payment amount and line item context match the finalized negotiation outcome.
- Backward compatibility is preserved: direct `initiate_link_checkout` payloads without `deal_id` continue to work unchanged.
- No sensitive card/auth data is logged by negotiation services; only deal metadata and pricing outcomes are recorded.


## 2026-02-26 Checkout finalization strict-mode gates (RunAshChat -> Link)

- Introduced strict checkout-finalization validation in `resolveCheckoutHandoffContext` for production flows:
  - requires authenticated merchant identity resolution,
  - requires canonical pricing snapshot (`subtotal`, `total`, `currency`),
  - requires canonical cart/product selection and customer billing region,
  - rejects synthetic fallback merchant/item defaults during production checkout finalization.
- Added explicit non-production compatibility override via `RUNASH_ALLOW_NON_PRODUCTION_CHECKOUT_FALLBACK=true` for local/dev/test workflows.
- Added chat-layer validation gates so `buy this` intent cannot execute `initiate_link_checkout` when required checkout context is incomplete.
- Blocked checkout attempts now return actionable remediation payloads (`missing_fields`, `next_action`) instead of silently applying implicit defaults.

### Impacted payment/auth flows
- RunAshChat Relay handoff generation for `initiate_link_checkout`.
- Authenticated merchant context propagation from session -> checkout handoff.

### Risks + rollback
1. **Risk:** legacy callers that depended on implicit fallback pricing/merchant defaults can now be blocked in production.
2. **Mitigation:** remediation payloads identify exact context gaps and required next action; local/dev can enable explicit fallback flag.
3. **Rollback:** disable strict enforcement by reverting `checkout-handoff-context-resolver` + `chat-request-handler` gate changes, restoring legacy defaulting behavior.

## 2026-02-26 Voice commerce orchestrator + streaming checkout contract

- Added a dedicated voice commerce orchestration chain that executes: speech-to-intent extraction, buyer preference search, negotiation/deal workflow, and `initiate_link_checkout` handoff for RunAshChat Instant Checkout.
- Introduced streaming-safe agent response contract (`voice-commerce-turn.v1`) that emits intermediate recommendation/negotiation events before the final checkout action payload.
- Integrated seller-side live session automation controls for product presentation, buyer query handling, bundle promotions, limited-time discounts, and approved-deal initiation with broker mediation fallback.
- Added persistent session automation event storage for replay/compliance (`stream_session_automation_events`) to support auditability across voice and live stream routes.

### Impacted payment/auth flows
- Relay Agent voice turn orchestration -> `initiate_link_checkout`.
- Deal negotiation acceptance/broker settlement path before payment handoff.
- Live stream seller AI automation actions that can culminate in approved deal checkout initiation.

### Risks + rollback
1. **Risk:** false-positive intent classification can route non-checkout utterances into negotiation/checkout preparation.
2. **Mitigation:** final checkout still respects `preview_displayed`, `user_confirmation_after_preview`, and validator middleware gates before terminal handoff.
3. **Rollback:** disable voice commerce entry routes (`/api/agents/voice-commerce`, `/api/streams/sessions/[id]/automation`) and retain existing chat-based checkout path.

## 2026-02 RunAshChat unified task shell + instant checkout intent simplification

- Simplified RunAshChat tool routing by centralizing message-to-tool selection in `lib/runash-chat/tooling.ts`.
- Added buyer-focused routing for prompts like `find ... under ₹/$...` to include `buyer_product_search` before checkout.
- Unified quick actions in `lib/runash-chat/quick-actions.ts` and surfaced a shared RunAshChat task board + feature grid for buyer/seller/broker/live-commerce/instant-checkout paths.
- Backward compatibility: existing `buy this` / `confirm purchase` / `pay now` intent behavior remains mapped to `catalog_lookup + initiate_link_checkout` without changing checkout payload contracts.
- Risks + rollback:
  1. If prompt routing over-triggers search tools, rollback by reverting `lib/runash-chat/tooling.ts` and restoring inline selection in `chat-workspace.tsx`.
  2. If new UI task cards create noise, rollback by removing `RunAshChatFeatureGrid`/`RunAshChatTaskBoard` imports in `chat-workspace.tsx` while keeping existing quick actions.


## 2026-02 Agentic commerce expansion (buyer/seller/broker + negotiation guardrails)

- Added buyer-preference aware routing and search stack support for prompts such as `find ... under ₹/$...` to execute `buyer_product_search + catalog_lookup + web_search`.
- Added seller optimization capabilities (`seller_optimize_commerce`) that return pricing recommendations, inventory risk insights, and bundle promotion suggestions.
- Added broker deal-matching capability (`broker_match_deal`) that returns deal recommendations with negotiation state and settlement recommendation metadata.
- Added negotiation guardrail on checkout execution: when `deal_id` is provided, checkout is blocked unless the deal has an accepted snapshot, preventing pre-settlement checkout bypass.
- Expanded role policy tool coverage so buyer/seller/broker permissions include new buyer/seller/broker commerce tools.
- Accounting sync metadata now carries accepted deal identifiers (`deal_id`, `accepted_offer_id`, `discount_basis`) through accounting context for auditability.

Risks and rollback:
1. If intent routing over-classifies seller/broker prompts, rollback by reverting intent branches in `app/api/agents/chat/chat-request-handler.ts` and `lib/runash-chat/tooling.ts`.
2. If merchant ops prefer manual optimization, rollback by removing `seller_optimize_commerce` from registry/policy while keeping buyer checkout path intact.
3. If negotiation-gate blocks expected sandbox checkouts, temporarily disable deal-id checkout enforcement in `services/agent-orchestration-service.ts` and re-enable after settlement data integrity validation.



## 2026-02 Settings billing contract expansion (backward-compatible)

Expanded the Settings Billing contract surface with dedicated endpoints that preserve stable payload keys consumed by the Settings UI cards.

### New/extended Settings billing endpoints
- `GET /api/settings/billing/summary`
- `GET /api/settings/billing/invoices`
- `GET /api/settings/billing/usage`
- `POST /api/settings/billing/upgrade`
- `POST /api/settings/billing/redeem-code`
- `GET /api/settings/billing/referrals`

### Backward-compatibility notes
- Existing stable keys are preserved and continue to be returned: `planName`, `subscriptionStatus`, `creditsBalance`, `billingMethodSummary`, `usageThisCycle`, `usageLimit`, `referralCode`, `invoiceEmail`, and `autoRechargeEnabled`.
- No existing settings billing keys were removed or renamed.
- Existing action routes remain available and now resolve values from the new settings-billing data layer.

### Risks + rollback
1. **Risk:** environments with sparse billing data can surface defaults more often (for example, fallback plan labels).
2. **Mitigation:** endpoints clamp/normalize outputs and preserve existing defaults to avoid UI regressions.
3. **Rollback:** revert `app/api/settings/billing/**`, restore prior static responses in `app/api/settings/actions/*` billing routes, and keep UI consuming previously persisted settings-only billing values.

## 2026-02 Settings action error contract hardening (backward-compatible)

Standardized settings action/billing error payloads to include a shared field-map shape:

- `errors: { <section>: { <field>: <message> } }`
- `error.code` machine-readable codes for action failures, authorization, validation, and rate limits.
- `error.details.validationErrors` preserved for compatibility with existing clients.

### Sensitive action controls
- Added/standardized 429 rate-limit responses and explicit error codes for:
  - 2FA disable (`/api/settings/actions/disable-2fa`)
  - API key regenerate/delete (`/api/settings/actions/regenerate-api-key`, `/api/settings/actions/delete-api-key`)
  - Session revocation (`/api/settings/actions/revoke-sessions`)

### Risks + rollback
1. **Risk:** clients hard-coded to `{ error: string }` only may ignore granular field errors.
2. **Mitigation:** legacy-compatible `error.message` and `error.details.validationErrors` are still returned.
3. **Rollback:** revert `app/api/settings/_lib/errors.ts` and route-level formatter adoption in `app/api/settings/**` if downstream compatibility issues surface.

## 2026-02 Settings billing/invoice/credits/referral behavior contract update

- Added canonical settings architecture + API contract reference at `docs/SETTINGS_ARCHITECTURE_API_CONTRACT.md` covering billing summary, invoices, usage, credits, redeem-code, referrals, and upgrade behavior.
- Confirmed backward-compatible stable response keys for settings billing:
  - `planName`, `subscriptionStatus`, `creditsBalance`, `billingMethodSummary`, `usageThisCycle`, `usageLimit`, `invoiceEmail`, `autoRechargeEnabled`.
- Invoice contract now documents normalized totals and hosted/PDF links as stable fields for settings consumers.
- Credits/redeem behavior now documents idempotent code application semantics to prevent duplicate credit grants.
- Referral behavior now documents stable counters for pending/earned/lifetime credits.

### Storage model + migration/rollback note (billing settings)

1. Billing settings read-models are backed by reconciliation-safe billing/invoice/credit/referral records.
2. Migration path remains additive: deploy schema + backfills, then switch settings endpoints to canonical projections.
3. Rollback path is application-first with feature-flag gating for new billing settings mutations while keeping additive schema intact.
4. Reconciliation parity checks are required before and after rollback to ensure invoice/credit/referral counters remain consistent.

