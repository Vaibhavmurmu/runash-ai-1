# Drizzle/Neon Migration Artifacts

This directory is configured as Drizzle migration output (`drizzle.config.ts -> out: ./db/migrations`).

Current status:
- Repository remains SQL-first for production migration execution (`scripts/sql/*.sql` and related `scripts/*.sql`).
- `0000_auth_neon_better_auth_baseline.sql` is the executable baseline for Better Auth tables plus RunAsh session registry tables.
- `0001_waitlist_entries.sql` provisions `waitlist_entries` for waitlist signups and duplicate-safe email capture.
- `0002_wallet_link_persistence.sql` provisions RunAsh AI Link wallet persistence tables (cards/link sessions/activity/subscription snapshots/OTP attempts).
- `0003_accounting_core.sql` + `0004_agent_role_decisions.sql` add accounting and agent decision infrastructure.
- `0005_waitlist_email_case_insensitive.sql` enforces a case-insensitive unique email index for waitlist duplicate protection.
- `0006_seller_settings.sql` provisions typed seller business profile storage keyed by `user_id`.

- `0006_chat_attachment_storage.sql` adds chat attachment metadata storage linked to session/message rows.

- `0006_feedback_and_referrals.sql` provisions feedback intake plus referral invite/conversion persistence.

- `0007_normalized_chat_tables.sql` provisions normalized `chat_sessions`, `chat_messages`, `chat_attachments`, and `chat_tool_events` tables with lifecycle/metadata fields plus query indexes.


- `0009_community_event_registrations.sql` provisions `community_events` and `community_event_registrations` with duplicate-safe `(event_id, user_id)` registration constraints and lookup indexes.

- `0011_email_subscriptions.sql` provisions `email_subscriptions` with case-insensitive unique email constraints, double-opt-in lifecycle status/timestamps, and source metadata fields for subscription auditability.

- `0012_newsletter_subscriptions.sql` provisions `newsletter_subscriptions` for consented newsletter signups with case-insensitive dedupe, status tracking, and audit timestamps.
- `0013_stream_editor_templates.sql` provisions persistent stream/editor templates plus template metrics counters and access-scope indexes.

- `0016_mcp_connectors_and_audit.sql` provisions tenant-scoped MCP connector configuration persistence plus MCP tool audit records with lifecycle indexes and connector-cascade cleanup.

Operational guidance:
1. Keep production-safe migration SQL reviewed and idempotent where practical.
2. When enabling generated Drizzle migrations in CI, add the migration journal metadata in this directory and keep the baseline SQL immutable after release tags.
3. Keep `db/schema.ts` and migration artifacts synchronized with Neon production schema rollout plans.


Chat migration ordering + rollback:
1. Apply `scripts/sql/2026-02-11_create_runash_chat_session_tables.sql` first.
2. Apply `scripts/sql/2026-02-28_create_runash_chat_attachment_tables.sql` second.
3. For rollback, disable attachment writes and run `scripts/sql/2026-02-28_rollback_runash_chat_attachment_tables.sql`.

4. Apply `scripts/sql/2026-03-06_create_normalized_chat_tables.sql` for normalized chat persistence tables.
5. For rollback of normalized chat tables, disable chat writes and run `scripts/sql/2026-03-06_rollback_normalized_chat_tables.sql`.
