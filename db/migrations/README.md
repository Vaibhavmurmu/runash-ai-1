# Drizzle/Neon Migration Artifacts

This directory is configured as Drizzle migration output (`drizzle.config.ts -> out: ./db/migrations`).

Current status:
- Repository remains SQL-first for production migration execution (`scripts/sql/*.sql` and related `scripts/*.sql`).
- `0000_auth_neon_better_auth_baseline.sql` is the executable baseline for Better Auth tables plus RunAsh session registry tables.
- `0001_waitlist_entries.sql` provisions `waitlist_entries` for waitlist signups and duplicate-safe email capture.
- `0002_wallet_link_persistence.sql` provisions RunAsh AI Link wallet persistence tables (cards/link sessions/activity/subscription snapshots/OTP attempts).

Operational guidance:
1. Keep production-safe migration SQL reviewed and idempotent where practical.
2. When enabling generated Drizzle migrations in CI, add the migration journal metadata in this directory and keep the baseline SQL immutable after release tags.
3. Keep `db/schema.ts` and migration artifacts synchronized with Neon production schema rollout plans.
