<div align="center">
  <a href="https://www.runash.in">
    <img src="public/runashlogo.jpg" width="100" height="100" alt="RunAsh AI logo" />
  </a>
  <h1>RunAsh AI</h1>
  <p>Open-source agentic live commerce platform for retail automation, real-time video generation, and multimodal workflows.</p>
</div>

## Overview
RunAsh AI combines live streaming, AI-assisted creation tooling, seller operations, and commerce enablement into a unified platform.

## Quickstart
1. Clone repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (copy `.env.example` to `.env.local` when available).
4. Run development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000`.

## Validation commands
```bash
npm run lint
npm run build
```

## Documentation index
### Governance and collaboration
- [AGENTS.md](AGENTS.md) – repository-wide contributor/agent rules
- [AGENTS.override.md](AGENTS.override.md) – high-priority override policies (service/payment scope)
- [TEAM_GUIDE.md](TEAM_GUIDE.md) – team workflow, ownership, release process
- [LLMs.txt](LLMs.txt) – compact machine-readable guidance
- [MCP_SERVER.md](MCP_SERVER.md) – MCP integration guidance
- [SKILLS/README.md](SKILLS/README.md) – reusable workflow playbooks
- [CODEX_CUSTOM_INSTRUCTIONS.md](CODEX_CUSTOM_INSTRUCTIONS.md) – custom Codex instruction policy

### Product and platform docs
- [PLATFORM_GUIDE.md](PLATFORM_GUIDE.md)
- [RUNASH-AUTH.md](RUNASH-AUTH.md)
- [SECURITY.md](SECURITY.md)
- [DRIZZLE_ORM.md](DRIZZLE_ORM.md)
- [RunAsh_AI_Pay.md](RunAsh_AI_Pay.md)
- [RUNASH_PAY_BUSINESS_IMPLEMENTATION.md](RUNASH_PAY_BUSINESS_IMPLEMENTATION.md)

## Contribution
1. Create a focused branch.
2. Keep code + docs in sync.
3. Run validation commands.
4. Open PR with summary, risks, and rollback notes.

## License
MIT and Apache-2.0.
