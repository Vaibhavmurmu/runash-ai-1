<div align="center">
  <a href="https://www.runash.in">
    <img src="public/runashlogo.jpg" width="100" height="100" alt="RunAsh AI logo" />
  </a>
  <h1>RunAsh AI</h1>
  <p>Open-source agentic live commerce built for retail automation, real-time video workflows, and multimodal customer experiences.</p>
</div>

## What RunAsh AI is

RunAsh AI is a Next.js-based platform for building and running AI-assisted commerce and livestream experiences.
It combines storefront and content workflows with agentic tooling, authentication, and data services.
The repository includes product UI, API routes, and shared service/data layers used by the platform.

## Quickstart

### 1) Install dependencies

```bash
pnpm install
```

### 2) Configure environment

- [ ] Create `.env.local` in the project root.
- [ ] Add the required secrets for auth, AI providers, database, and integrations used in your environment.

### 3) Start the development server

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Core architecture summary

- **Next.js App Router application**
  - `app/` contains routes, pages, layouts, and API handlers.
  - `components/` contains reusable UI and feature modules.
- **Service and integration layer**
  - `services/` and `lib/services/` contain orchestration and business logic.
  - `lib/auth/`, `lib/workflow/`, and integration-specific modules support platform capabilities.
- **Data and model layer**
  - `lib/db/`, `lib/repositories/`, and `lib/data/` contain database access and domain modeling.
  - See `DRIZZLE_ORM.md` for ORM and schema conventions.

## Documentation index

### Working agreements and team docs

- [AGENTS.md](AGENTS.md)
- [AGENTS.override.md](AGENTS.override.md)
- [TEAM_GUIDE.md](TEAM_GUIDE.md)

### Platform and engineering guides

- [PLATFORM_GUIDE.md](PLATFORM_GUIDE.md)
- [RUNASH-AUTH.md](RUNASH-AUTH.md)
- [DRIZZLE_ORM.md](DRIZZLE_ORM.md)
- [SECURITY.md](SECURITY.md)
- [LLMs.txt](LLMs.txt)
- [MCP.md](MCP.md)

## Deployment checklist

- [ ] Build locally: `pnpm build`
- [ ] Validate runtime env vars for target environment
- [ ] Deploy via Vercel (recommended) or your Node hosting platform
- [ ] Verify `/`, auth, and key API routes in the deployed environment

## Contribution checklist

- [ ] Create a branch from `main`
- [ ] Implement and test changes locally (`pnpm dev`, `pnpm build`, `pnpm lint`)
- [ ] Keep docs updated when behavior or architecture changes
- [ ] Open a pull request with a clear summary and validation notes

## License

MIT and Apache-2.0.
