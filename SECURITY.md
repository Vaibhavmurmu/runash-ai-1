# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.3.0.x   | :x: |
| 1.2.0.x   | :x:              |
| 1.1.0.x   | :x: |
| < 1.0.0   | :white_check_mark:              |

## Reporting a Vulnerability

Use this section to tell people how to report a vulnerability.

Tell them where to go, how often they can expect to get an update on a
reported vulnerability, what to expect if the vulnerability is accepted or
declined, etc.

## AI Chat Turn Hardening

The `POST /api/v1/agents/chat` endpoint includes mandatory runtime controls per request:

- **Authentication gate:** only authenticated sessions can open chat streams.
- **Rate limiting:** per-user/IP request windows reduce abuse and brute-force traffic.
- **Tool authorization:** requested tools are validated and mapped to RBAC permissions before use.
- **Correlation IDs:** each turn carries a request correlation identifier (`x-correlation-id`) for traceability.
- **Structured logging:** chat lifecycle events are logged as metadata-only records without prompt/response body data.

## API Log Redaction Standard

Chat/session handlers now emit structured logs with request correlation IDs and metadata-only payloads.

Sensitive auth/payment/chat keys are redacted before logs are written (for example: `password`, `token`, `authorization`, `payment`, `card`, `cvv`, `otp`, `message`, `content`, `prompt`).

Reference: `docs/API_CONTRACTS.md`.

## Agent orchestration security controls

- Prompt-injection screening rejects obvious jailbreak patterns before model execution.
- Tool/audit payloads redact secrets and payment-like identifiers before persistence/logging.
- High-risk actions (payment/account-impacting operations) require explicit user confirmation via `/api/agents/actions`.
- Agent transcript/tool records use retention pruning (`RUNASH_AGENT_RETENTION_DAYS`, default 30 days) for PII minimization.



## Settings mutation confirmation policy

High-risk settings mutations are protected by mandatory user-intent confirmations in UI flows. The dialog gate applies to account deletion, session revocation, API key regeneration/deletion, 2FA disablement, and subscription cancellation/downgrade operations.

Operational requirements:
- No sensitive token/key values are displayed in confirmation dialogs.
- Mutation requests execute only after explicit user confirmation.
- Dialogs surface pending/error states to prevent repeated unsafe retries.


## Settings security hardening updates

The settings UI/API contract includes hardening controls for sensitive security operations:

- API keys are never re-displayed in full after creation. Rotation returns a one-time copy value and stores only masked metadata for subsequent reads.
- Security actions (`revoke-sessions`, `regenerate-api-key`, `delete-api-key`, `disable-2fa`) require strict server-side payload validation with explicit user intent confirmation.
- Security settings updates reject invalid mutation payloads and preserve server-owned key metadata.
- Client security forms send minimal payloads and clear sensitive fields after mutation completion.
- 2FA disable operations execute against backend 2FA state, not only UI preference state.

Cross-reference: `RUNASH-AUTH.md`, `docs/DOC_GOVERNANCE.md`.

## Payment and billing session hardening

Payment and billing APIs now enforce server-side session authentication and ownership authorization checks against the user and organization context from JWT-backed NextAuth sessions.

### Security controls added
- Canonical server session extraction for billing/payment routes via `getServerSession` wrapper utilities.
- Route-level ownership checks to prevent cross-user and cross-organization billing access.
- Privileged action audit logging for payment intent creation/confirmation, subscription mutations, analytics access, and billing session creation.
- Audit payload sanitization to avoid persisting sensitive auth/payment secrets.

### Explicit exception
- `POST /api/billing/webhook` remains non-session authenticated because it is provider-originated and validated with Stripe webhook signatures.



### Correlation and audit requirements
- Payment, billing, and auth routes must return both `x-request-id` and `x-correlation-id` headers (same value), and include `requestId` in error/success JSON payloads where supported.
- Route failures must be logged through structured API logging helpers (no raw `console.error` in auth/payment/billing handlers).
- Logs must include event name, route, method, and request ID only, with sensitive fields redacted by key and value patterns.
- Provider payload internals, raw emails, tokens, and payment method identifiers must not be logged directly.

## Admin API authorization response and audit policy (2026-02)

- All `app/api/admin/**` routes must authorize through `requireAdminAuthorization(...)` in `lib/auth-middleware.ts` with route-specific permissions.
- Denied responses are standardized:
  - `401`: `{ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" }, requestId }`
  - `403`: `{ success: false, error: { code: "FORBIDDEN", message: "Forbidden" }, requestId }`
- Both denied responses must include `x-request-id` and `x-correlation-id` headers (same value).
- Admin authorization outcomes must be auditable:
  - Denials: `*.unauthorized`, `*.forbidden`
  - Allowed access: `*.allowed`
- Audit events must not include sensitive auth/payment payload data.

## Observability log redaction standard (auth + payment)

All auth/payment route logs must go through `lib/api/logging.ts` and emit structured fields only:

- `event`
- `requestId`
- `route`
- `method`
- `details.errorCode` (and non-sensitive operational metadata only)

Redaction policy:
- Redact sensitive key names and nested values (for example `password`, `token`, `authorization`, `cookie`, `email`, `otp`, `payment`, `card`, `cvv`, `auth`, `session`, `credential`).
- Redact token-like and email-like raw string values when encountered in nested payloads.
- Never include direct user identifiers (email, raw auth token, card/account data) in logs; use `requestId` for traceability.

Operational guidance:
- Incident triage and cross-system correlation must use `x-request-id` / `requestId`.
- Avoid logging full request bodies for auth/payment flows.



## Payment-specific authentication hardening

- **Single auth source for billing/payment APIs:** server-side session identity is required for payment/billing routes; header-only user identity patterns are rejected for these flows.
- **Usage endpoint anti-spoofing:** billing usage ingestion binds `customerId` and `userId` to the authenticated session user.
- **RBAC + organization scope:** `customer_admin`, `customer_operator`, and `customer_finance` roles are treated as payment operators only when organization scope is present.
- **Session integrity for payment methods:** payment-method mutation endpoints enforce a session integrity check by comparing a hashed device/browser fingerprint with the most recent authorized checkout session.
- **Sensitive data minimization:** payment controls avoid logging raw payment/auth payload material and continue requiring tokenized provider references.


## Payment authz ownership + redaction requirements

- Customer-scoped payment resources must enforce both RBAC action permissions and session ownership checks before read/write operations.
- Do not trust caller-supplied customer/user identifiers in billing/payment route bodies for authorization decisions.
- Continue structured logging only; redact payment/auth sensitive fields and avoid raw credential/payment payload logging in all payment/billing handlers.


## Billing encryption policy update (2026-02)

- Sensitive billing profile fields must remain encrypted at rest.
- Production deployments must provide explicit encryption key material through `CHECKOUT_PROFILE_ENCRYPTION_KEY` (or approved auth-secret fallback).
- Weak implicit defaults are not permitted in production environments.
- Payment/auth logs must avoid sensitive payload fields and raw credentials/card data.

## 2026-02 auth runtime migration security note

- Middleware and API auth checks now resolve from Better Auth session validation and shared session extraction helpers.
- Sensitive token material is not logged in migration paths; only role/scope authorization outcomes are used for control flow.
- Migration requires operational verification that `better-auth.session-token` is forwarded intact through edge/network layers.

## OAuth account-linking security policy update (2026-02)

RunAsh account-linking now follows an explicit deny-by-default model for OAuth identity binding:

- `allowDangerousEmailAccountLinking` is disabled for configured OAuth providers.
- Linking an OAuth identity to an existing RunAsh user requires verified email on the destination RunAsh account.
- Provider subject ownership is enforced: an OAuth subject (`accountId`) already linked to one user cannot be linked to another.
- Provider + subject (`providerId` + `accountId`) is the canonical account-link identity tuple used by policy checks.
- Optional step-up verification can be required globally (`AUTH_ACCOUNT_LINK_STEP_UP_REQUIRED=true`) or per-provider (`AUTH_RISKY_ACCOUNT_LINK_PROVIDERS`).
- Audit logging captures link attempts/denials/allows while avoiding raw token data and raw provider subject values in logs.

### Migration impact

- Existing links are preserved.
- New link attempts may now be denied unless verification and ownership requirements are met.
- Environments enabling step-up enforcement must update linking clients/flows to send `x-runash-link-step-up: verified` after successful challenge completion.

## Auth migration status linkage (2026-02)

- The repository auth migration audit and implemented-vs-planned phase status are maintained in `RUNASH-AUTH.md` ("Endpoint Audit" and "Current Status").
- Payment/business release validation must confirm auth readiness against that status before enabling payment-surface changes.
- Governance cross-reference for release docs: `RunAsh_AI_Pay.md` and `RUNASH_PAY_BUSINESS_IMPLEMENTATION.md`.


## Implemented vs Planned alignment (2026-02 refresh)

### Implemented
- Admin management endpoints for roles, permissions, sessions, audit logs, and feature flags are present with request-schema validation and admin authorization checks.
- Migration helper support exists in `lib/migration-helpers.ts` to provision admin auth governance tables in Neon-backed deployments.
- Database URL resolution is standardized in `lib/db.ts` with `DATABASE_URL` as the primary connection source.

### Planned
- Better Auth full route-surface replacement and Drizzle-managed schema migrations remain planned and are tracked in `RUNASH-AUTH.md`.

## Database environment policy

For security and operational consistency, production should define `DATABASE_URL` as the canonical Neon connection string. Compatibility fallbacks (`NEON_DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `runash_POSTGRES_URL`, `runash_POSTGRES_URL_NON_POOLING`) are transitional and should not replace `DATABASE_URL` as the primary source.
