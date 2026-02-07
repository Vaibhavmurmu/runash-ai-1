# AGENTS.md — RunAsh AI Default Repository Policy

## 1) Project identity and mission

RunAsh AI is an open-source, agentic live commerce and retail automation platform focused on:
- real-time video generation and streaming,
- multimodal AI tooling,
- production-grade developer and operator workflows.

When contributing, prioritize outcomes that improve reliability, user trust, operational clarity, and long-term maintainability of the RunAsh ecosystem.

## 2) Mandatory workflow (always follow)

1. **Read before edit**
   - Read the target file(s) and related interfaces/dependencies before changing code.
   - Confirm existing patterns (folder structure, naming, data flow, and API contracts) and follow them.
2. **Keep diffs minimal and scoped**
   - Change only what is needed for the request.
   - Avoid opportunistic refactors unless they are required to safely complete the task.
3. **Preserve architecture**
   - Do not introduce new architectural layers, frameworks, or abstractions unless explicitly requested.
   - Preserve established boundaries (UI vs domain logic vs data access) and module responsibilities.
4. **Validate changes**
   - Run lint/type/build/test commands relevant to the touched area when available.
   - If a check cannot run due to environment constraints, explicitly note it.
5. **Explain intent clearly**
   - Summarize what changed, why, risk level, and any follow-up actions in PR descriptions.

## 3) Coding standards (TypeScript / React / Next.js)

### General
- Prefer TypeScript-first, strict-safe patterns; avoid `any` unless justified and documented.
- Prefer clear, composable, side-effect-light functions.
- Keep modules focused; avoid bloated files and cross-concern leakage.

### React / Next.js
- Use function components and hooks.
- Use Server/Client Components intentionally; add `"use client"` only when needed.
- Keep data fetching close to the server boundary when possible.
- Prefer explicit props types/interfaces and descriptive prop names.
- Favor accessibility defaults (semantic elements, labels, keyboard-friendly interactions).

### Naming and structure
- Use descriptive names:
  - `PascalCase` for React components and types.
  - `camelCase` for variables/functions.
  - `SCREAMING_SNAKE_CASE` for immutable global constants/env keys.
- Avoid abbreviations that reduce readability.
- Match existing directory and route conventions.

### Lint / formatting expectations
- Code must pass repository linting/formatting and TypeScript checks when configured.
- Do not suppress lint/type rules unless there is a clear, documented reason.
- Keep imports tidy and remove dead code.

## 4) Documentation update requirements

When behavior visible to users, operators, or integrators changes, update docs in the same PR.

At minimum, update whichever applies:
- `README.md` for setup, usage, or workflow changes.
- API/docs references for contract changes.
- Environment variable documentation (`.env.example` and related docs) for config changes.
- Migration or rollout notes for breaking/operationally sensitive changes.

If no docs updates are needed, state that explicitly in the PR body.

## 5) Pull request requirements

### PR title template
`<type>(<scope>): <short summary>`

Examples of `type`: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`.

### PR body template
```md
## Summary
- What changed
- Why it changed

## Validation
- [ ] lint
- [ ] typecheck
- [ ] tests
- [ ] build (if applicable)

## Documentation
- Docs updated: <yes/no>
- If no, explain why.

## Risk & rollout
- Risk level: <low/medium/high>
- User impact: <none/internal/external>
- Rollback plan: <brief>

## Notes
- Follow-ups, limitations, or assumptions
```

### PR checklist expectations
- Keep PRs small and reviewable.
- Include risk notes for non-trivial changes.
- Flag breaking changes clearly.
- Include screenshots for visual UI changes when practical.

## 6) Safety and secrets handling

- **Never** hardcode secrets, API keys, tokens, or credentials in code, tests, fixtures, or docs.
- Use environment variables for sensitive values and document required keys.
- Keep `.env.local` and other secret-bearing files out of version control.
- Redact sensitive information from logs, screenshots, and PR descriptions.
- Apply least-privilege principles for tokens and service accounts.
- If a secret is exposed accidentally, rotate/revoke it immediately and note mitigation steps in the PR.
