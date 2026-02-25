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

## Auth dependency notes for payment flows

- OTP email login verification now mints canonical auth sessions and secure Better Auth cookies for `purpose=login`; non-login OTP purposes remain verification-only.
- This auth-session alignment does not change payment API contracts, webhook payloads, or billing field names.
- Payment-linked auth messaging uses the canonical provider module (`lib/email-provider.ts`) and deterministic provider selection (`EMAIL_PROVIDER=smtp|resend`).
- Protected payment flows rely on Better Auth session validation via `/api/auth/get-session` and canonical Better Auth session cookies.
- Legacy NextAuth cookie compatibility remains temporary during migration windows to avoid lockouts.
- RBAC authorization remains aligned with canonical `viewer` / `operator` / `admin` capabilities with compatibility mapping where still required.

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
