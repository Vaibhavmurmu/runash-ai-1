# TEAM_GUIDE.md

Operational guide for RunAsh AI contributors.

## Ownership model
- **Frontend**: `app/`, `components/`, `contexts/`
- **Service layer**: `services/`
- **Platform/security/auth**: `RUNASH-AUTH.md`, `SECURITY.md`, auth integrations
- **Commerce/payment**: `RunAsh_AI_Pay.md`, `RUNASH_PAY_BUSINESS_IMPLEMENTATION.md`
- **Data/runtime docs**: `PLATFORM_GUIDE.md`, `DRIZZLE_ORM.md`

## Delivery workflow
1. Create focused branch and small scoped PR.
2. Keep implementation and docs in sync.
3. Run checks locally (`npm run lint`, `npm run build` as possible).
4. Submit PR with validation + risk notes.

## Code review SLA
- Normal PRs: first review target within 1 business day.
- Hotfix/security PRs: prioritize same day.

## Incident severity guidance
- **SEV-1**: payment outage/security incident – immediate mitigation + rollback plan.
- **SEV-2**: core user-path failure – hotfix queue.
- **SEV-3**: non-critical UX/ops degradation – scheduled fix.

## Release checklist
- [ ] Lint/build pass
- [ ] Docs updated
- [ ] Monitoring notes included
- [ ] Rollback path clear

## Architecture change proposals
For medium/large structural changes include:
- concise rationale
- impacted modules
- migration/backward-compatibility plan
- test/validation plan
