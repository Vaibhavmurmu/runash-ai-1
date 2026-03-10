# Service & API Reliability Validation — 2026-03-10

## Validation scope
Post-refactor verification focused on:
- Dashboard data surfaces backed by persistence for streams, MCP connectors, API keys, and chat fallback suggestions.
- Auth boundaries and tenant/user isolation on updated API routes.
- Migration sequencing and rollback planning for schema artifacts used by these routes.

## Commands executed
- `npm run lint` → **failed** because ESLint v9 config file (`eslint.config.*`) is not present in repository root.
- `npm run build` → **failed** during page-data collection due to missing Neon database connection string in environment.
- `node --loader ./scripts/node-ts-loader.mjs --test app/api/dashboard/streams/templates/route.test.ts app/api/dashboard/mcp/mcp-routes.integration.test.ts app/api/streams/sessions/route-authz.test.ts app/api/streams/route.test.ts app/api/chat/route.test.ts lib/api-platform/api-key-store.test.ts lib/chat/fallback-assistant-response.test.ts lib/api/route-auth.tenant-guard.test.ts app/api/admin/users/tenant-guard.test.ts`
  - **partial pass**: core streams/templates/chat/api-key/tenant-guard tests passed.
  - **failures** were environment/runtime compatibility limitations:
    - missing `DATABASE_URL`/Neon connection string for modules imported by `app/api/admin/users/tenant-guard.test.ts`
    - missing `BETTER_AUTH_SECRET` for `app/api/streams/sessions/route-authz.test.ts`
    - `t.mock.module` incompatibility in `app/api/dashboard/mcp/mcp-routes.integration.test.ts`
- `node --loader ./scripts/node-ts-loader.mjs --test app/dashboard/workspace-ui-modules.test.ts app/api/analytics/route.widget-contract.test.ts` → **passed**.
- `node --loader ./scripts/node-ts-loader.mjs --test app/api/templates/templates-route-handler.test.ts app/api/templates/template-by-id-route-handler.test.ts` → **passed**.

## Dashboard widget/data verification notes
- Streams template persistence path is covered by passing route tests for create/list/update behavior and auth checks.
- MCP connector lifecycle + audit retrieval test is present, but currently blocked by `t.mock.module` runtime mismatch in this environment.
- API key persistence and rotation history behavior are validated via passing `api-key-store` tests.
- Chat fallback behavior is validated by passing fallback helper tests and chat route tests for unauthorized + pagination behavior.

## Auth boundary and cross-user isolation results
Validated coverage from passing tests:
- Tenant guard behavior: same-tenant allowed, cross-tenant blocked, legacy null-row handling explicit.
- Streams endpoints: authenticated seller access pattern and validation behavior.
- Templates API: auth enforcement, 403 for disallowed access, 404 handling for missing resources.
- Chat API: unauthorized access rejected and query validation enforced.

Remaining auth/isolation checks blocked by missing env/runtime requirements:
- streams session authz suite requiring `BETTER_AUTH_SECRET`
- admin tenant-guard suite importing Neon-backed modules without DB connection string

## Schema/migration changes and order
No new schema files were added in this validation-only pass. Existing migration artifacts relevant to this release window:
1. `scripts/sql/2026-03-08_create_stream_editor_templates.sql`
2. `db/migrations/0015_api_key_platform_persistence.sql`
3. `scripts/sql/2026-03-10_create_mcp_connector_tables.sql`

Recommended apply order in shared environments:
1. Stream/editor templates
2. API key persistence
3. MCP connector + MCP tool audit tables

## Rollback guidance
- If MCP connector rollout must be reverted: disable connector writes/reads at route layer, then drop `mcp_tool_audit_records` followed by `mcp_connectors` after data snapshot.
- If API key persistence rollout must be reverted: disable key issuance/rotation endpoints, export active key metadata for audit, then drop `api_key_usage_counters`, `api_key_rotation_history`, `api_key_secret_material`, and `api_key_metadata` in dependency-safe order.
- If template persistence rollout must be reverted: disable template CRUD endpoints, then drop `stream_editor_template_metrics` before `stream_editor_templates`.
- Chat rollback remains as documented in `db/migrations/README.md` using:
  - `scripts/sql/2026-02-28_rollback_runash_chat_attachment_tables.sql`
  - `scripts/sql/2026-03-06_rollback_normalized_chat_tables.sql`

## Post-deploy release checklist (short)
- [ ] Create API key, rotate once, verify masked value + status/history in dashboard/API.
- [ ] Create MCP connector, reload dashboard, confirm connector persists and audit records append on invocation.
- [ ] Execute template CRUD (create/read/update/delete) across tenant boundary and verify non-owner receives forbidden response.
- [ ] Validate chat fallback behavior by forcing assistant fallback path and confirming minimal safe response payload.
- [ ] Validate stream/template widgets load persisted records after hard refresh and after new record creation.
