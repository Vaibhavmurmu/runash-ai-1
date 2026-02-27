# Settings Architecture + API Contract

Last updated: 2026-02

This document defines the canonical Settings domain architecture and API contracts for:
- Security settings (sessions, devices, 2FA)
- API key settings
- Billing settings (plan, invoices, usage, credits, referrals)

Cross-links: `RUNASH-AUTH.md`, `SECURITY.md`, `RunAsh_AI_Pay.md`, `RUNASH_PAY_BUSINESS_IMPLEMENTATION.md`, `docs/API_CONTRACTS.md`.

## 1) Architecture boundaries

### 1.1 Settings domain modules

- **Settings Security module**
  - Owns active session management, trusted device lifecycle, and 2FA state management.
  - Enforces user-scoped ownership checks before reads/writes.
- **Settings API Key module**
  - Owns create/list/revoke/rotate for user API keys.
  - Stores only hashed key secrets; raw API keys are return-once only.
- **Settings Billing module**
  - Owns billing summary, invoice listing, cycle usage, credit balance, redeem-code operations, and referral overview.
  - Uses billing reconciliation snapshots as source-of-truth for customer-visible states.

### 1.2 Contract guarantees

1. API responses are additive-first; existing fields are preserved.
2. Stable key names are not renamed without explicit versioning.
3. Sensitive security/payment materials are never returned in plaintext after create-time responses.
4. Error payloads preserve a shared structured shape (`error.code`, `errors`, optional validation details).

## 2) API contract (settings security + access)

### 2.1 Sessions

#### `GET /api/settings/security/sessions`
Returns active sessions for the authenticated user.

- Response fields (stable):
  - `sessions[]`: `id`, `mode`, `scope`, `device`, `lastSeenAt`, `createdAt`, `isCurrent`
  - `concurrentSessionCount`
- Security behavior:
  - No bearer token value/token hash is returned.
  - Device metadata is normalized and redacted to operational context only.

#### `PATCH /api/settings/security/sessions`
Updates editable metadata for a user-owned session.

- Request body (stable): `sessionId`, optional `scope`
- Response: updated session metadata only.

#### `DELETE /api/settings/security/sessions`
Revokes a specific session or all sessions.

- Request body (stable): `sessionId` OR `revokeAll=true`
- Response: revoke summary (`revokedCount`, optional `revokedSessionIds`)

### 2.2 Trusted devices

#### `GET /api/settings/security/devices`
Returns trusted devices for the authenticated user.

- Response fields (stable):
  - `devices[]`: `deviceId`, `name`, `platform`, `lastSeenAt`, `trustedAt`, `status`

#### `POST /api/settings/security/devices`
Creates or confirms trusted-device registration.

- Request body (stable): `deviceId`, optional `name`, optional `platform`
- Response: trusted device record.

#### `DELETE /api/settings/security/devices`
Revokes trusted-device status.

- Request body (stable): `deviceId`
- Response: revoke outcome summary.

### 2.3 Two-factor authentication (2FA)

#### `GET /api/settings/security/2fa`
Returns user 2FA state.

- Response fields:
  - `enabled`
  - `methods[]` (for example `totp`, `email_otp`, `webauthn`)
  - `recoveryCodesRemaining`

#### `POST /api/settings/security/2fa/enable`
Enables 2FA after step-up verification.

- Request body (stable): method-specific enrollment payload + challenge verification payload.
- Response: `enabled=true`, method state, recovery-code metadata.

#### `POST /api/settings/security/2fa/disable`
Disables 2FA only after verified step-up + explicit confirmation.

- Request body (stable): verification challenge + confirmation reason code.
- Response: `enabled=false` + audit-safe metadata.

### 2.4 API keys

#### `GET /api/settings/api-keys`
Returns API key metadata for the authenticated user.

- Response fields (stable):
  - `keys[]`: `id`, `label`, `scopes`, `createdAt`, `lastUsedAt`, `expiresAt`, `status`

#### `POST /api/settings/api-keys`
Creates a new API key.

- Request body (stable): `label`, `scopes[]`, optional `expiresAt`
- Response fields:
  - `key`: plaintext secret value (one-time return only)
  - `metadata`: persisted key metadata

#### `DELETE /api/settings/api-keys/:id`
Revokes an API key.

- Response: revoke summary (`revoked=true`, `id`)

#### `POST /api/settings/api-keys/:id/rotate`
Rotates API key material while preserving key identity contract.

- Response:
  - one-time `key` plaintext value
  - updated metadata

## 3) API contract (settings billing)

### 3.1 Billing summary and usage

#### `GET /api/settings/billing/summary`
- Stable fields: `planName`, `subscriptionStatus`, `creditsBalance`, `billingMethodSummary`, `usageThisCycle`, `usageLimit`, `invoiceEmail`, `autoRechargeEnabled`.

#### `GET /api/settings/billing/usage`
- Stable fields: `cycleStart`, `cycleEnd`, `usage`, `limit`, `overagePolicy`, `creditsApplied`.

### 3.2 Invoices

#### `GET /api/settings/billing/invoices`
- Stable fields per invoice: `invoiceId`, `number`, `status`, `issuedAt`, `currency`, `subtotal`, `tax`, `total`, `amountPaid`, `amountDue`, `hostedInvoiceUrl`, `pdfUrl`.
- Ordering: reverse chronological by `issuedAt`.

### 3.3 Credits + redeem-code

#### `POST /api/settings/billing/redeem-code`
- Request body: `code`
- Stable response fields: `applied`, `creditsDelta`, `newCreditsBalance`, `campaignRef`.
- Idempotency: repeated valid code submission returns prior applied state without double-crediting.

### 3.4 Referrals

#### `GET /api/settings/billing/referrals`
- Stable fields: `referralCode`, `invitesSent`, `conversions`, `pendingCredits`, `earnedCredits`, `lifetimeCredits`.

### 3.5 Plan upgrade

#### `POST /api/settings/billing/upgrade`
- Request body: `targetPlan`, optional `billingCycle`, optional `confirmProration`
- Stable response fields: `status`, `targetPlan`, `effectiveAt`, `prorationPreview`, `checkoutUrl` (when external confirmation is required).

## 4) Storage model changes

## 4.1 Security + auth settings storage

- `auth_session_registry`
  - Stores canonical session records across `cookie`/`bearer`/`ott` modes.
  - Includes normalized device metadata for security audit and remote management.
- `auth_session_identities`
  - Stores scope-aware session identity linkage for user/session switching behavior.
- Trusted devices table (user-scoped)
  - Composite ownership key pattern: `(user_id, device_id)`.
- API key storage
  - Stores hashed key material and metadata (label/scopes/expiry/last-used); never stores retrievable plaintext secrets.
- 2FA storage
  - Stores method enrollment metadata, challenge state, and recovery-code hashes only.

## 4.2 Billing settings storage

- Billing projections are sourced from reconciliation-safe billing tables and wallet timeline snapshots.
- Invoice list values map to provider-backed invoice records plus normalized totals for consistent UI contract shape.
- Credits/referral values are derived from ledger-safe credit transactions and referral attribution records.

## 5) Migration + rollback procedure

### 5.1 Migration steps

1. Deploy additive schema migration artifacts for settings-security and settings-billing support.
2. Backfill user/device/session metadata where needed using idempotent scripts.
3. Deploy API layer and UI consumers that read from new settings domains.
4. Run smoke checks:
   - security sessions/devices list + revoke/update paths
   - 2FA state read and enrollment disable/enable path
   - API key create/list/revoke/rotate path
   - billing summary/invoices/usage/redeem-code/referrals paths

### 5.2 Rollback steps

1. **Application rollback first:** redeploy previous stable artifact.
2. Disable new settings mutations using feature flags if partial outage is isolated to specific surface area.
3. Keep additive tables in place; avoid destructive schema rollback during incident containment.
4. Re-enable previous read paths and monitor auth/billing error rates + reconciliation lag.
5. Perform targeted data repair (if needed) before re-attempting rollout.

### 5.3 Explicit rollback triggers

- Elevated `401/403` rates on settings security endpoints after deploy.
- Session revoke/switch operations failing above SLO threshold.
- Billing summary/invoice totals divergence from reconciliation source-of-truth.
- Credits/redeem/referral double-apply or mismatch alerts.

## 6) Backward compatibility commitments

- Existing field names and response envelope shapes remain unchanged unless versioned.
- New fields are additive and optional for legacy clients.
- Payment/auth-sensitive values remain redacted or hashed in transport and storage.
- Legacy settings action routes remain operational during migration windows.


## 7) Milestone delivery plan (feature-flag gated)

All phases are shipped behind independent feature flags and can be rolled back without destructive schema changes.

| Phase | Scope | Feature flags (example) | Telemetry to capture |
| --- | --- | --- | --- |
| **Phase 1** | IA shell + route scaffolding + read-only settings views for billing, usage, sessions, and devices. | `FEATURE_FLAG_SETTINGS_IA_SHELL`, `FEATURE_FLAG_SETTINGS_READONLY_VIEWS` | `settings_view_load_failed_total`, `settings_view_load_retry_total`, endpoint-level read latency/error rates |
| **Phase 2** | Mutations + explicit confirmation dialogs + attachment uploads for settings operations. | `FEATURE_FLAG_SETTINGS_MUTATIONS`, `FEATURE_FLAG_SETTINGS_CONFIRMATIONS`, `FEATURE_FLAG_SETTINGS_ATTACHMENTS` | `settings_mutation_failed_total`, `settings_mutation_retry_total`, `settings_upload_failed_total`, `settings_upload_retry_total` |
| **Phase 3** | Dedicated storage migration + audit logging + advanced billing/referral flows. | `FEATURE_FLAG_SETTINGS_DEDICATED_STORAGE`, `FEATURE_FLAG_SETTINGS_AUDIT_LOGGING`, `FEATURE_FLAG_SETTINGS_ADVANCED_BILLING` | `settings_migration_failed_total`, `settings_migration_retry_total`, `settings_audit_write_failed_total`, billing/referral failure+retry rates |

### 7.1 Phase gates

- Promote a phase only after failure/retry metrics are stable within SLO and no auth/payment incident triggers are active.
- Each phase keeps legacy read paths available until post-gate validation succeeds.
- API contracts remain additive-first during all phases (no field renames/removals without versioning).

### 7.2 Explicit rollback steps per phase

For **each** phase rollback, execute in this order:

1. **Disable phase feature flags** for the affected rollout surface.
2. **Revert API route bindings** to the prior stable handlers (legacy route/controller/service mapping).
3. **Restore legacy read path** as the primary data source for user-visible settings pages.
4. Validate auth/payment/billing/session health and reconcile queued writes before re-attempting rollout.

#### Phase-specific rollback focus

- **Phase 1:** disable IA/read-only flags, remap settings route scaffolding to previous dashboard/settings pages, keep canonical legacy billing/usage/session/device readers active.
- **Phase 2:** disable mutation/upload/confirm flags, remap mutation routes to stable legacy handlers, force read-only fallback while replaying/reconciling failed writes.
- **Phase 3:** disable storage/audit/advanced-billing flags, route back to legacy read/write paths, pause advanced referral/billing automation until audit and migration parity checks pass.

