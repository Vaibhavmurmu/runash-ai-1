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

## 2026-02 validation-only reliability check (no contract changes)

- **Change type:** validation-only pass; no payment runtime behavior, API signature, webhook schema, or field-name changes were introduced.
- **Impacted payment/auth flows reviewed:**
  - Checkout entry via `/pricing?intent=credits`
  - Settings action payment-adjacent APIs (`credits-balance`, `refer-earn`, `upgrade-plan`)
  - Auth-gated payment access via Better Auth session validation (`/api/auth/get-session`)
- **Risk assessment:** low product risk because this update is documentation + validation only; primary operational risk is CI/local build interruption when database environment variables are absent.
- **Rollback plan:** revert this documentation commit if needed; no data migration, no API rollback, and no payment contract rollback required.

## Auth dependency notes for payment flows

- OTP email login verification now mints canonical auth sessions and secure Better Auth cookies for `purpose=login`; non-login OTP purposes remain verification-only.
- This auth-session alignment does not change payment API contracts, webhook payloads, or billing field names.
- Payment-linked auth messaging uses the canonical provider module (`lib/email-provider.ts`) and deterministic provider selection (`EMAIL_PROVIDER=smtp|resend`).
- Protected payment flows rely on Better Auth session validation via `/api/auth/get-session` and canonical Better Auth session cookies.
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
