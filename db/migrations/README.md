# Drizzle/Neon Migration Artifacts

This directory is configured as Drizzle migration output (`drizzle.config.ts -> out: ./db/migrations`).

Current status:
- Repository remains SQL-first for production migration execution (`scripts/sql/*.sql` and related `scripts/*.sql`).
- `0000_auth_neon_better_auth_baseline.sql` is a planned baseline placeholder for auth/session/account table alignment.

Operational guidance:
1. Keep production-safe migration SQL reviewed and idempotent where practical.
2. When enabling generated Drizzle migrations in CI, add the migration journal metadata in this directory.
3. Keep `db/schema.ts` and migration artifacts synchronized with Neon production schema rollout plans.
