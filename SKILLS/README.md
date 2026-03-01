 
# Skills Playbooks Index

This folder contains lightweight workflow playbooks for common change types in this repository.

## Available playbooks

- [Frontend Feature Workflow](./frontend-feature-workflow.md)
- [Service Layer Change Workflow](./service-layer-change-workflow.md)
- [Auth & Payment Change Workflow](./auth-payment-change-workflow.md)
- [Docs Quality Review Workflow](./docs-quality-review-workflow.md)

## How to use

1. Pick the playbook that best matches the task.
2. Confirm required inputs before making changes.
3. Follow the procedure and complete the validation checklist.
4. Review common pitfalls to avoid regressions specific to this repo.

# SKILLS

Reusable playbooks for contributors and coding agents.

## Available workflows
- `frontend-feature-workflow.md`
- `service-change-workflow.md`
- `auth-payment-change-workflow.md`
- `docs-review-workflow.md`

## Codex skill installation notes

- Codex user-installed skills are expected under: `/opt/codex/skills`.
- In this environment, only system skills are currently present under `/opt/codex/skills/.system`.
- Attempted installs:
  - `npx skills add better-auth/skills`
  - `npx skills add resend/resend-skills`
  - `npx skills add resend/email-best-practices`
  - `npx add-mcp https://resend.com/docs/mcp`
- Result: install commands returned `npm ERR! code E403` from the npm registry, so no additional skills/MCP entries were added.
- Restart note: **Restart Codex to pick up new skills.**
