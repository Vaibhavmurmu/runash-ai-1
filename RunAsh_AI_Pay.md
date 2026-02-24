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
