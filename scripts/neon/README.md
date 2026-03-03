# Neon Branching & Safe Migration Helper

This guide is intentionally non-destructive. It documents how to bootstrap Neon locally and how to run migrations safely across dev/staging/prod.

## 1) Bootstrap Neon CLI

```bash
export NEON_API_KEY="<your-neon-api-key>"
npx neonctl@latest init
```

During `init`, select:
- Neon project matching the RunAsh deployment target,
- branch matching the environment (`dev`, `staging`, `prod`),
- database/role when prompted.

## 2) Branch conventions

- **dev**: rapid iteration branch for local development and integration testing.
- **staging**: pre-production validation branch; migration rehearsal and QA gate.
- **prod**: production branch with strict change control.

Recommended mapping:
- local + preview apps -> `dev`
- shared QA/UAT -> `staging`
- production runtime -> `prod`

## 3) Environment variable mapping

When Neon CLI returns a connection string, map it to app env vars:

1. Set `DATABASE_URL` (primary var used by runtime).
2. Optionally set `NEON_DATABASE_URL` for explicit Neon naming.
3. Keep compatibility fallbacks only where needed for legacy hosts/CI:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `runash_POSTGRES_URL`
   - `runash_POSTGRES_URL_NON_POOLING`

`lib/db.ts` resolves vars in the order above and throws if none are configured.

## 4) Safe migration flow (non-destructive-first)

1. **Design additively first**: add nullable columns/new tables before removals or renames.
2. **Apply to dev branch** and run application + integration tests.
3. **Rehearse on staging** with production-like data shape.
4. **Backfill/dual-read** where needed before contract changes.
5. **Promote to prod** only after verification + rollback path is documented.

### Commands (example)

```bash
# generate + review SQL diff
npx drizzle-kit generate

# apply to selected branch after explicit verification
npx drizzle-kit migrate
```

## 5) Rollback and payment/auth safety note

For schema changes that can affect payment or auth behavior:

- Add explicit migration/rollback notes in the PR.
- Prefer feature-flagged rollout and reversible, additive schema phases.
- Keep API field names/signatures backward-compatible until consumers are migrated.

Before merging payment/auth-impacting schema changes, review:
- [`RunAsh_AI_Pay.md`](../../RunAsh_AI_Pay.md)
- [`RUNASH_PAY_BUSINESS_IMPLEMENTATION.md`](../../RUNASH_PAY_BUSINESS_IMPLEMENTATION.md)

If risk is detected post-release, prioritize fast mitigation:
1. Disable/rollback feature flags,
2. revert app deploy,
3. apply tested compensating migration only when data safety is confirmed.
