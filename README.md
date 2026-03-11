# RunAsh AI

RunAsh AI is a real-time AI-powered live commerce platform where AI hosts run shopping streams, interact with viewers, present products, answer questions, support multilingual voice/video experiences, generate clips, and drive purchases through integrated commerce systems.

## Core capabilities

- AI-hosted live commerce sessions
- Real-time viewer chat and engagement
- Product overlays and dynamic CTAs
- English/Hindi speech and translation workflows
- Clips, highlights, and post-live content generation
- RunAsh Pay, Pay Link checkout, wallet, and payouts
- Seller analytics and campaign optimization

## Monorepo structure

- `apps/` — user-facing and internal apps
- `services/` — domain services and APIs
- `workers/` — async and heavy background jobs
- `packages/` — shared libraries and contracts
- `prompts/` — versioned AI prompt assets
- `data-contracts/` — canonical event/API/webhook schemas
- `docs/` — architecture, runbooks, ADRs, and API docs
- `infrastructure/` — deployment and platform config

## Engineering principles

- Keep live-path latency low
- Prefer event-driven and async processing
- Separate media, agent, and commerce concerns
- Never trust client-authoritative commerce values
- Enforce idempotency for payments, webhooks, and critical events
- Use structured logs, metrics, tracing, and correlation IDs

## Getting started

1. Install workspace dependencies
2. Configure `.env`
3. Start required local dependencies
4. Run apps/services in dev mode
5. Run tests and linters before merging

## Repo rules

See:
- `AGENTS.md`
- scoped `AGENTS.md` files in service/app directories
- `docs/architecture/`
- `docs/adr/`

## Initial priorities

Recommended v1 focus:
- `apps/dashboard`
- `services/live-orchestrator`
- `services/agent-runtime`
- `services/product-knowledge`
- `services/commerce`
- `services/payments`
- `services/clips`
- `workers/media-worker`
- `workers/webhook-worker`

## Prompt management

Do not hardcode large prompts directly into application logic.

Store prompts in:
- `prompts/host-agent/`
- `prompts/seller-copilot/`
- `prompts/moderation/`
- `prompts/translation/`

## Contracts

All shared event, API, and webhook contracts should live under `data-contracts/`.
