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

## Payment and billing session hardening

Payment and billing APIs now enforce server-side session authentication and ownership authorization checks against the user and organization context from JWT-backed NextAuth sessions.

### Security controls added
- Canonical server session extraction for billing/payment routes via `getServerSession` wrapper utilities.
- Route-level ownership checks to prevent cross-user and cross-organization billing access.
- Privileged action audit logging for payment intent creation/confirmation, subscription mutations, analytics access, and billing session creation.
- Audit payload sanitization to avoid persisting sensitive auth/payment secrets.

### Explicit exception
- `POST /api/billing/webhook` remains non-session authenticated because it is provider-originated and validated with Stripe webhook signatures.


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

