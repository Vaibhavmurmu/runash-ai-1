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

