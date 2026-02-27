# Auth & Organization Config Incident Runbook

Last updated: 2026-02-24

## Scope

Use this runbook for incidents involving privileged changes to:
- enterprise identity providers,
- SSO organization lifecycle state,
- tenant-scoped user assignments.

## Severity guidance

- **SEV-1:** Widespread admin auth lockout, tenant-wide login failure, or accidental organization deactivation affecting production sign-ins.
- **SEV-2:** Partial provider mapping outage, tenant assignment drift impacting onboarding/provisioning.
- **SEV-3:** Single-tenant misconfiguration with workaround.

## Immediate containment

1. Pause further config changes (announce change freeze).
2. Capture the incident timeline, actor IDs, and impacted org IDs.
3. Query `admin_audit_logs` for latest `organization.*`, `identity.provider.*`, and `tenant.user.*` actions.
4. If provider mapping changes caused impact, revert to prior known-good mapping values using `POST /api/admin/identity/providers`.
5. If org was mistakenly deactivated, reactivate through `PUT /api/admin/sso/organizations/:id` with `isActive=true`.

## Rollback playbooks

### A) Organization lifecycle rollback

- Identify last valid org state (slug/domain/default role/is_active) from audit metadata.
- Execute `PUT /api/admin/sso/organizations/:organizationId` restoring prior values.
- Validate:
  - organization is active,
  - SSO flags match expected state,
  - test login for tenant user succeeds.

### B) Provider mapping rollback

- Retrieve previous mapping keys/values from audit trail and deployment notes.
- Re-apply mapping via `POST /api/admin/identity/providers` using same `organizationId` + `providerType`.
- Validate:
  - provider health remains `healthy` in `/api/admin/identity/health`,
  - SSO assertion claims map to expected org fields.

### C) Tenant-scoped user assignment rollback

- For accidental assignment, run `DELETE /api/admin/sso/organizations/:organizationId/users/:userId`.
- For missing assignment, run `POST /api/admin/sso/organizations/:organizationId/users` with target `userId`.
- Validate:
  - `GET /api/admin/sso/organizations/:organizationId/users` reflects expected roster,
  - impacted user session can access correct tenant scope.

## Communications checklist

- Post initial status update with severity and blast radius.
- Share rollback action and ETA.
- Publish resolution note with:
  - root cause,
  - restored config state,
  - prevention action items.

## Hardening follow-ups

- Add guardrail tests for the failed path.
- Add dashboard alert thresholds for auth/org mutation spikes.
- Review least-privilege admin permissions for actors involved.
