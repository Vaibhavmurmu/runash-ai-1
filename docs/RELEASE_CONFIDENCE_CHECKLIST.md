# Release Confidence Checklist

Use this checklist for every release-oriented PR to make release confidence auditable across engineering, product, and operations.

## 1) Feature completeness by module

Track shipped scope and validation evidence per module.

| Module | Planned scope | Implemented scope | Status | Evidence |
| --- | --- | --- | --- | --- |
| `app/<area>` | `<what was expected>` | `<what shipped>` | ✅ Complete / ⚠️ Partial / ❌ Blocked | Test IDs, screenshots, docs links |
| `lib/<area>` | `<what was expected>` | `<what shipped>` | ✅ Complete / ⚠️ Partial / ❌ Blocked | Unit/integration test references |
| `services/<area>` | `<what was expected>` | `<what shipped>` | ✅ Complete / ⚠️ Partial / ❌ Blocked | Contract checks/observability notes |

**Required signoff:**
- Product confirms planned scope is met (or accepts known deltas).
- Owners of touched modules confirm no hidden TODOs remain for release-critical flows.

## 2) Accessibility baseline

Minimum release bar for changed UI surfaces:
- Keyboard navigation is complete (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Esc`).
- Focus order is logical and visible under light/dark themes.
- New controls have accessible names and semantic roles.
- Color contrast and target sizes meet baseline requirements.

Document what was checked and any deferred issues in the PR checklist.

## 3) Responsive behavior signoff

Validate changed layouts at representative breakpoints:
- Mobile: `320x700`
- Tablet: `768x1024`
- Desktop: `1366x768`
- Optional: ultrawide `1920x1080`

Signoff expectations:
- No clipped primary actions or inaccessible controls.
- Navigation/overflow behavior matches design intent.
- Dialogs, tables, and form flows remain usable.

Reference: `docs/RESPONSIVE_LAYOUT_SPEC.md`.

## 4) Quality gates (lint/type/build/test)

Run and record outcomes in PR:

| Gate | Command | Required outcome |
| --- | --- | --- |
| Lint | `npm run lint` | Pass or documented environment limitation |
| Type safety | `npx tsc --noEmit` | Pass or documented exception with owner |
| Build | `npm run build` | Pass for releasable branch |
| Tests | `npm run test` | Pass for impacted scope |

If any gate is bypassed, include:
1. why it was bypassed,
2. risk introduced,
3. rollback and follow-up owner/date.

## 5) API contract verification

For endpoint, payload, or schema changes:
- Verify backward compatibility for existing consumers.
- If incompatible changes are required, version endpoints/contracts and document migration notes.
- Confirm generated OpenAPI docs are in sync where applicable.

Suggested checks:
- `npm run openapi:auth:check`
- Manual review of changed request/response shapes in `docs/API_CONTRACTS.md` and endpoint handlers.

## 6) Rollback playbook and risk notes

Every release PR must include:
- Risk level (`low`, `medium`, `high`) and blast radius.
- Explicit rollback triggers (error threshold, SLO breach, business KPI regression).
- Exact rollback steps (artifact revert, flag disable, script rollback path).
- Data impact notes (migration, backfill, compensating action).

Template snippet for PRs:

```md
Risk level: <low|medium|high>
Primary risk areas: <modules/endpoints>
Rollback triggers: <alerts/thresholds>
Rollback steps:
1. <step>
2. <step>
Data implications: <none|details>
```

## Required audit trail

A release PR is considered auditable when all of the following exist:
1. PR template sections completed with command outcomes.
2. Links to impacted docs and module evidence.
3. API compatibility/migration notes (if applicable).
4. Rollback plan with trigger thresholds.

Keep this checklist synchronized with `.github/pull_request_template.md`.

## 7) Chat + attachment deployment readiness

Complete for releases that touch chat APIs, streaming, or attachment storage.

### Required environment + secret checks

| Check | Owner | Status | Evidence |
| --- | --- | --- | --- |
| `RUNASH_AGENT_CHAT_ENABLED` default verified per environment | Backend | ⬜ | Config diff / env snapshot |
| Stream timeout and heartbeat vars configured (`RUNASH_CHAT_API_TIMEOUT_MS`, `RUNASH_CHAT_STREAM_HEARTBEAT_MS`) | Backend | ⬜ | Runtime config output |
| Attachment storage config present (`RUNASH_ATTACHMENT_STORAGE_PROVIDER`, `RUNASH_ATTACHMENT_BUCKET`, `RUNASH_ATTACHMENT_REGION`) | DevOps | ⬜ | IaC/env evidence |
| Attachment credentials present in secret manager only (`RUNASH_ATTACHMENT_ACCESS_KEY_ID`, `RUNASH_ATTACHMENT_SECRET_ACCESS_KEY`) | Security + DevOps | ⬜ | Secret manager audit log |
| Signed URL and size limits configured (`RUNASH_ATTACHMENT_SIGNED_URL_TTL_SECONDS`, `RUNASH_ATTACHMENT_MAX_BYTES`) | Backend | ⬜ | API config check |

### Migration ordering + rollback checks

| Check | Owner | Status | Evidence |
| --- | --- | --- | --- |
| Applied `2026-02-11_create_runash_chat_session_tables.sql` before attachment migration | Backend | ⬜ | DB migration log |
| Applied `2026-02-28_create_runash_chat_attachment_tables.sql` | Backend | ⬜ | DB migration log |
| Rollback script reviewed: `2026-02-28_rollback_runash_chat_attachment_tables.sql` | Backend + DBA | ⬜ | Runbook reference |
| Data retention/backup checkpoint captured before rollback-capable deploy | DevOps + DBA | ⬜ | Snapshot ID |

## 8) Go-live owner sign-off block (required)

| Area | Required owner | Sign-off (`approved`/`blocked`) | Name | Date (UTC) | Notes |
| --- | --- | --- | --- | --- | --- |
| Product scope + launch readiness | Product |  |  |  |  |
| API contract compatibility | Backend |  |  |  |  |
| Migration + rollback readiness | DBA / Backend |  |  |  |  |
| Runtime config + secrets | DevOps |  |  |  |  |
| Monitoring + alerting | SRE/DevOps |  |  |  |  |
| Security review (data handling, redaction, IAM) | Security |  |  |  |  |
| On-call incident readiness | Engineering Manager |  |  |  |  |
