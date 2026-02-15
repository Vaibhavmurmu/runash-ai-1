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
