# AGENTS.md

Repository-wide operating guidance for human and AI contributors to **RunAsh AI**.

## 1) Mission and product context
RunAsh AI is an agentic live commerce platform spanning video generation, streaming, seller tooling, automation services, and commerce operations.

## 2) Default contribution workflow
1. Read impacted files first; preserve existing architecture and naming patterns.
2. Prefer small, focused diffs over broad rewrites.
3. Update documentation whenever behavior, contracts, or workflows change.
4. Run local checks before submitting (`npm run lint`, `npm run build` when feasible).
5. Include risk notes and rollback thoughts in PR descriptions.

## 3) Coding and quality conventions
- Stack baseline: Next.js + TypeScript + React.
- Keep components/services cohesive; avoid unrelated refactors.
- Preserve public APIs unless migration notes are included.
- Never add secrets/tokens in source code or docs.
- Do not add `try/catch` around import statements.

## 4) Required docs synchronization
When changing any area below, update linked docs in the same PR:
- Auth/security: `RUNASH-AUTH.md`, `SECURITY.md`
- Platform/runtime behavior: `PLATFORM_GUIDE.md`
- Payments: `RunAsh_AI_Pay.md`, `RUNASH_PAY_BUSINESS_IMPLEMENTATION.md`
- Agent workflows: `AGENTS.override.md`, `LLMs.txt`, `MCP_SERVER.md`, `SKILLS/*`

## 5) PR expectations
PRs should include:
- Problem statement
- What changed
- Validation commands run and outcomes
- Risks / backward compatibility notes
- Follow-up tasks

## 6) Override policy
`AGENTS.override.md` can define temporary or critical directives (e.g., release freeze, security hardening sprint, payment hotfix windows). If conflicts exist, override rules win for the defined scope and time.

## 7) Documentation map
- `TEAM_GUIDE.md` – team process and ownership
- `LLMs.txt` – compact AI/LLM contributor briefing
- `MCP_SERVER.md` – MCP server integration standards
- `SKILLS/README.md` – reusable contribution playbooks
- `CODEX_CUSTOM_INSTRUCTIONS.md` – RunAsh AI Codex-specific execution and validation rules
