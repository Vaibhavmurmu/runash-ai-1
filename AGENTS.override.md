# AGENTS.override.md

High-priority directives that override `AGENTS.md` when applicable.

## Active override: Service & Payment Reliability

### Scope
Applies to changes touching:
- `services/**`
- payment/auth/business flows
- files: `RunAsh_AI_Pay.md`, `RUNASH_PAY_BUSINESS_IMPLEMENTATION.md`, `RUNASH-AUTH.md`, `SECURITY.md`

### Mandatory rules
1. **Safety first:** no breaking changes to payment flow contracts without migration notes.
2. **Backward compatibility:** preserve existing field names and API signatures unless explicitly versioned.
3. **Auditability:** document payment-impacting behavior changes in PR body and in payment docs.
4. **Security hardening:** never log sensitive payment/auth data.
5. **Validation floor:** run `npm run lint`; run `npm run build` when dependencies are available.

### Change checklist (required)
- [ ] Impacted payment/auth flows identified
- [ ] Risks + rollback noted
- [ ] Docs updated (`RunAsh_AI_Pay.md` and/or `RUNASH_PAY_BUSINESS_IMPLEMENTATION.md`)
- [ ] Validation commands captured

## Precedence
- This file overrides `AGENTS.md` for scoped files.
- If no active override applies, follow `AGENTS.md`.
