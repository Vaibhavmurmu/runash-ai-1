# Auth & Payment Change Workflow

## Use when
Touching auth/payment/business-critical logic.

## Steps
1. Confirm override rules in `AGENTS.override.md`.
2. Avoid contract breaks unless versioned/migrated.
3. Sanitize logging and avoid sensitive-data exposure.
4. Update payment/auth docs.
5. Validate with lint/build and record outcomes.
