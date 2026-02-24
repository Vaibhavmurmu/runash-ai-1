# Admin Auth & Organization Route Inventory

Last updated: 2026-02-24

This inventory maps all existing auth/organization-related admin APIs under `app/api/admin/**` to current admin UI coverage and highlights remaining gaps.

## API inventory and UI mapping

| API route | Purpose | UI surface | Coverage status | Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/identity/health` | Protocol health snapshots for OIDC/OAuth/SAML | `/admin/identity` protocol health list | ✅ Covered | Read-only health panel. |
| `GET /api/admin/identity/providers` | Read enterprise provider configs | `/admin/identity` configured providers list | ✅ Covered | Sensitive secrets are excluded from response payloads. |
| `POST /api/admin/identity/providers` | Upsert provider + org mappings | `/admin/identity` provider mapping tools | ✅ Covered | UI now supports provider name + mapping key/value upsert. |
| `GET /api/admin/sso/organizations` | List organizations and status | `/admin/identity` organizations section | ✅ Covered | Added for lifecycle visibility. |
| `POST /api/admin/sso/organizations` | Create organization | `/admin/identity` organization lifecycle form | ✅ Covered | Supports default role + SSO/autoprovision flags. |
| `PUT /api/admin/sso/organizations/:organizationId` | Update organization settings | `/admin/identity` organization actions | ✅ Covered | Toggle SSO from organizations list. |
| `DELETE /api/admin/sso/organizations/:organizationId` | Deactivate organization | `/admin/identity` tenant operations | ✅ Covered | Soft-deactivation sets `is_active=false`. |
| `GET /api/admin/sso/organizations/:organizationId/users` | List tenant-scoped users | `/admin/identity` tenant-scoped user list | ✅ Covered | Enables org-level user visibility. |
| `POST /api/admin/sso/organizations/:organizationId/users` | Assign user to tenant | `/admin/identity` tenant-scoped user operations | ✅ Covered | Uses user-id assignment action. |
| `DELETE /api/admin/sso/organizations/:organizationId/users/:userId` | Unassign user from tenant | `/admin/identity` tenant-scoped user operations | ✅ Covered | Removes tenant binding safely. |
| `GET /api/admin/users` | Cross-tenant user listing + filters | `/admin/users` | ✅ Covered | Existing global user admin view. |
| `GET/PUT/DELETE /api/admin/users/:userId` | Per-user read/update/deactivate | `/admin/users` | ⚠️ Partial | No tenant-scoped filter controls in `/admin/users`; tenant operations are now in `/admin/identity`. |
| `GET /api/admin/payment-auth/health` | Payment/auth health checks | `/admin/payment-auth` | ✅ Covered | Operational monitoring only. |
| `GET /api/admin/analytics/auth*` | Auth analytics and metrics | no dedicated admin analytics screen in this repo | ⚠️ Gap | API-only currently; dashboard integration is a follow-up. |

## Remaining UI gaps

1. Tenant filter chips/search are not yet integrated into `/admin/users`.
2. Provider credential rotation UX is intentionally absent from UI (server supports secure upsert paths, but secrets should be managed through controlled workflows).
3. Auth analytics endpoints remain API-first and are not surfaced with dedicated visualizations.

## Audit and safety notes

- All privileged organization/provider/tenant-user writes now record admin audit events.
- Provider endpoints do not expose credential secrets in API responses.
- Incident response and rollback actions for auth/org config changes are documented in `docs/AUTH_ORG_INCIDENT_RUNBOOK.md`.
