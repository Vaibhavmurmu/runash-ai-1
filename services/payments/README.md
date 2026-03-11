# Payments

Implements RunAsh Pay and Pay Link checkout orchestration.

## Responsibilities

- checkout session creation
- payment event handling
- secure checkout link workflows
- webhook ingestion and validation
- payment lifecycle tracking

## Notes

Payments are correctness-critical. Idempotency, auditability, and secure state transitions are required.
