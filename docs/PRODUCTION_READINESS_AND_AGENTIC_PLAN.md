# RunAsh AI Repository Review, Production Readiness Roadmap, and Agentic Chat Implementation Plan

> Status sync note: keep seller/chat implementation wording aligned with the README Seller Operations + chat preview limitations section: [`README.md`](../README.md).

## 1) Repository Review Snapshot

### 1.1 Current architecture and strengths
- **Monorepo-style Next.js App Router structure** with clear top-level domains: `app/` (routes + APIs), `components/`, `lib/`, `services/`, `types/`.
- **Good breadth of API surface area** already exists under `app/api/**` (auth, billing, products, streaming, analytics, admin, chat).
- **Foundational security patterns are present** in multiple places (auth checks, rate limiting, schema validation), e.g. registration flow and auth APIs.

### 1.2 Key production gaps observed
- Several feature areas still appear to rely on **demo-mode or placeholder behavior** (for example, in-memory datasets and simulated chat replies).
- Some docs and naming indicate **inconsistencies between declared and actual implementation state**.
- Test coverage appears **very sparse** relative to API and service surface area.

---

## 2) Four Concrete Fix Tasks Identified

### Task A — Typo Fix (high-confidence)
**Issue:** Product repository module should be `lib/repositories/products.ts` to align with TypeScript module resolution.

**Why it matters:**
- Multiple components import from `@/lib/repositories/products`, which conventionally resolves to `products.ts` or `products/index.ts`.
- A `.ys` extension can break module resolution, type checking, and runtime imports.

**Proposed fix task:**
1. Ensure `lib/repositories/products.ts` is used for this repository module.
2. Run `npm run lint` and `npm run build`.
3. Verify product pages/API routes compile and import cleanly.

---

### Task B — Bug Fix (chat backend bypass)
**Issue:** `app/chat/page.tsx` currently sends user messages and produces assistant output via `setTimeout` + local branching instead of consistently using server APIs/LLM orchestration.

**Why it matters:**
- Breaks persistence/analytics/guardrails opportunities.
- Produces non-deterministic UX and duplicated logic between frontend and backend.
- Makes auth, rate limiting, and observability difficult to enforce uniformly.

**Proposed fix task:**
1. Replace simulated response path with API-backed flow (e.g. `/api/chat` or a new `/api/agents/chat`).
2. Keep typed rendering for rich message cards (products/recipes/tips), but source payloads from backend tool calls.
3. Add robust failure states (timeout, retry, partial response, offline fallback).
4. Add migration note for chat-session shape if payload contracts change.

---

### Task C — Docs/Comment Discrepancy Fix
**Issue:** `IMPLEMENTATION _SUMMARY.md` describes several agent modules/endpoints as already implemented, but corresponding paths do not exist in repository (for example `lib/agents/*`, `app/api/agents/chat/route.ts`, `lib/db/agent-db.ts`).

**Why it matters:**
- Misleads contributors and reviewers.
- Can cause wrong implementation assumptions and release risk.

**Proposed fix task:**
1. Update `IMPLEMENTATION _SUMMARY.md` to separate **"implemented"** vs **"planned"** items.
2. Add a traceability table: `capability → file path → status`.
3. Link to a tracked implementation issue list for missing modules.

---

### Task D — Test Improvement
**Issue:** Existing `lib/stream-emitter.test.ts` validates happy-path publish/remove, but does not test failure behavior when `write()` throws or client cleanup on broadcast exceptions.

**Why it matters:**
- SSE reliability depends on robust cleanup behavior.
- Error paths are where resource leaks and stale clients commonly occur.

**Proposed fix task:**
1. Add tests for broadcast error handling (simulate throwing `write`).
2. Assert client gets removed and `end()` is called exactly once.
3. Add test for custom event names and payload serialization edge cases.

---

## 3) Remaining Requirements to Reach Production-Ready State

## 3.1 Backend and API requirements
1. **Unified service contracts**
   - Standardize API response envelope (`success`, `data`, `error`, `requestId`).
   - Version external-facing APIs (`/api/v1/...`) for safe evolution.

2. **Persistence maturity**
   - Replace demo/in-memory data dependencies with durable storage abstractions.
   - Define ownership boundaries between `lib/repositories/**` and `services/**`.

3. **Agent orchestration backend**
   - Introduce a dedicated orchestration layer for tool routing, retries, and policy checks.
   - Persist tool invocation logs and message lineage for auditability.

4. **Operational controls**
   - Add idempotency keys for payment/order/chat action endpoints where duplicate requests are risky.
   - Add circuit breakers/timeouts around external providers (LLM/payment/email).

5. **Observability and SLOs**
   - Structured logs (JSON), correlation/request IDs, metrics, traces.
   - Alerting baselines: API p95 latency, error rates, queue depth, webhook failures.

## 3.2 Security and compliance requirements
1. Apply input validation (zod/schema) consistently on all mutation endpoints.
2. Ensure secrets are environment-scoped and never logged.
3. Add abuse prevention for chat and auth endpoints (per-user + per-IP quotas).
4. Add webhook signature verification and replay protection for payment/email integrations.
5. Perform dependency and container scanning in CI.

## 3.3 Scalability requirements
1. Introduce queue-driven async processing for heavy tasks.
2. Add cache tier (Redis) for hot reads and session/tool state.
3. Use database indexing + pagination for high-volume tables (messages, analytics, orders).
4. Enforce backpressure/stream limits on SSE/WebSocket channels.

---

## 4) Step-by-Step Backend Implementation Guide (Production Path)

### Phase 0 — Baseline and alignment
1. Freeze API contracts for auth/payment/chat critical paths.
2. Document existing endpoint inventory and classify: stable, beta, legacy.
3. Define SLIs/SLOs and error budgets per domain.

### Phase 1 — Foundation hardening
1. Add a shared API utility for response envelopes + error mapping.
2. Add request ID middleware and structured logger injection.
3. Enforce schema validation on every write endpoint.
4. Add centralized rate-limit policy by endpoint class.

### Phase 2 — Data and repository stabilization
1. Resolve repository naming/typing inconsistencies.
2. Introduce transaction boundaries for multi-step mutations.
3. Add migration policy and seed policy for non-prod environments.
4. Ensure all critical flows have rollback-safe operations.

### Phase 3 — Domain services and orchestration
1. Move business logic out of route handlers into service layer methods.
2. Add orchestration services for multi-provider flows (chat toolchain, payments, notifications).
3. Add retry + timeout + fallback behavior per provider.

### Phase 4 — Testing and release confidence
1. Add unit tests for pure services and adapters.
2. Add integration tests for auth/payment/chat APIs.
3. Add smoke E2E tests for highest-value flows.
4. Gate merges on lint/build/test + coverage thresholds.

### Phase 5 — Deployment and runtime operations
1. Add staged environments (dev/staging/prod) with isolated secrets.
2. Configure canary rollout + fast rollback playbook.
3. Add dashboards + alerts for critical customer journeys.
4. Run game-day drills for payment/chat outage scenarios.

---

## 5) Comprehensive Agentic Features Plan for the Chat Page

## 5.1 Product goals
- Deliver a trustworthy AI chat that can reason, call tools, and complete actions.
- Preserve existing RunAsh UI/UX patterns while making responses real-time, reliable, and auditable.

## 5.2 Frontend implementation plan
1. **Conversation shell upgrades**
   - Keep existing chat layout and message cards.
   - Add explicit message states: `queued`, `streaming`, `tool-running`, `completed`, `failed`.

2. **Agent transparency UI**
   - Add collapsible tool activity timeline per assistant turn.
   - Show safety/guardrail notices when responses are constrained.

3. **Session and continuity**
   - Persist session IDs and message cursors.
   - Add resume/reconnect for interrupted streams.

4. **Actionable message cards**
   - Product/recipe/automation cards should include deterministic action handlers (add to cart, schedule follow-up, save suggestion).

## 5.3 Backend API plan for agentic chat
1. **POST `/api/agents/chat`**
   - Accepts user message, session context, tool permissions.
   - Returns SSE stream of events:
     - `token`
     - `tool_start`
     - `tool_result`
     - `final`
     - `error`

2. **GET `/api/agents/sessions/:id`**
   - Returns conversation history, unresolved actions, and latest state.

3. **POST `/api/agents/actions`**
   - Executes explicit user-approved actions (checkout prep, reminders, inventory updates).

4. **POST `/api/agents/feedback`**
   - Captures response quality and safety feedback for model/tool tuning.

## 5.4 Data management strategy
1. Store normalized entities: sessions, messages, tool calls, tool outputs, action logs.
2. Keep raw LLM output plus rendered output for replay/debug.
3. Use retention policies and PII minimization for chat transcripts.
4. Add searchable indexes for support/debug workflows.

## 5.5 Security model for agentic chat
1. Enforce authenticated access + scoped tool permissions.
2. Add prompt-injection and unsafe-tool-call detection layer.
3. Prevent sensitive data leakage in logs/events.
4. Require user confirmation for high-risk actions (payments, account changes, external sends).

## 5.6 Performance and UX optimization
1. Stream partial responses quickly (<1s first token target).
2. Cache frequent tool results (catalog lookups, static metadata).
3. Debounce repeated user intents and collapse duplicate tool calls.
4. Use optimistic UI for reversible actions.

## 5.7 Scalability plan
1. Separate chat ingress from tool workers via queue.
2. Horizontal scale stateless API workers.
3. Add per-tenant quotas and adaptive throttling.
4. Route long-running tool tasks to async job system.

## 5.8 Rollout plan
1. Internal dogfood behind feature flag.
2. Limited beta cohort with strict monitoring.
3. Progressive rollout by tenant tier.
4. Full rollout after SLO stability and incident-free window.

---

## 6) Recommended execution order (next 30 days)
1. Fix repository/API integrity blockers (typo file, docs discrepancies).
2. Switch chat page from simulated to backend-backed responses.
3. Introduce agent chat endpoints + SSE event schema.
4. Add persistence, tool logging, and guardrails.
5. Expand automated tests and release gates.
6. Run staged rollout with observability and rollback checks.

## 7) Best-practice checklist
- Keep API contracts versioned and backward-compatible.
- Prefer typed schemas and runtime validation for all boundary crossings.
- Ensure every critical flow has logs, metrics, and alerts.
- Design every external dependency call with timeout, retry, and circuit-breaker behavior.
- Protect customer data by default (least privilege, data minimization, redaction).

---

## 8) Inline Comment Resolution: Step-by-Step Implementation Work Packages

No explicit inline review comment thread was included in the task payload. To address the request for actionable implementation guidance, the four identified issues are converted into assignable execution stubs below.

### 8.1 Fix typo blocking repository import resolution

:::task-stub{title="Standardize repository module filename to products.ts"}
1. In `lib/repositories/`, verify `products.ts` is present and used by imports.
2. Search imports using `@/lib/repositories/products` and confirm no file-extension-specific imports exist.
3. Verify all exports in the renamed file are unchanged (`Product`, `listProducts`, `getProduct`, `createProduct`, `updateProduct`, `deleteProduct`) to preserve API compatibility.
4. Run `npm run lint` and `npm run build`.
5. Document the change in release notes as a non-breaking repository integrity fix.
:::

### 8.2 Fix chat-page backend bypass bug

:::task-stub{title="Replace simulated chat responses with API-backed agent response flow"}
1. In `app/chat/page.tsx`, replace the `setTimeout` + `buildAssistantResponse` simulation path in `handleSendMessage` with `fetch` to a backend route (`/api/chat` or `/api/agents/chat`).
2. Keep existing UI patterns (`ChatMessageComponent`, `QuickActions`, `VoiceControls`) and map backend payload types to existing `ChatMessage` render types.
3. Add loading, timeout, and retry handling in the client path, including a fallback assistant message on transport or 5xx failures.
4. Ensure session continuity by persisting `sessionId` and linking new user turns to backend session state.
5. Add a server-side guardrail in the target API handler for auth check + input validation + standardized error envelope.
6. Validate with `npm run lint` and `npm run build`.
:::

### 8.3 Fix implementation-doc discrepancy

:::task-stub{title="Align implementation summary with actual repository state"}
1. Update `IMPLEMENTATION _SUMMARY.md` so each claimed module is marked as either `Implemented`, `Partially implemented`, or `Planned`.
2. For each capability section (agent service, orchestrator, DB, websocket, queue), include the real path if present; if absent, mark as planned and link to an issue placeholder.
3. Add a traceability table with columns: `Capability`, `Expected Path`, `Current Path`, `Status`, `Next Action`.
4. Add a dated "Last verified against repository" line to prevent stale status drift.
5. Cross-link this section from `docs/DOC_GOVERNANCE.md` update triggers to reinforce doc-sync policy.
:::

### 8.4 Improve SSE emitter test coverage

:::task-stub{title="Extend stream-emitter tests to cover broadcast failure and cleanup behavior"}
1. In `lib/stream-emitter.test.ts`, add a test client whose `write` method throws on the first or second write call.
2. Call `broadcast`/`publish` and assert the failing client is removed from emitter state and `end()` is invoked.
3. Add a test that uses a non-default event name to verify `event: <name>` framing remains correct.
4. Add a serialization edge-case test for nested payload objects to verify JSON framing integrity.
5. Keep tests deterministic (no timers/random values) and run with the existing Node test runner command used for repository tests.
:::

### 8.5 Production-ready backend implementation sequence

:::task-stub{title="Execute phased backend production-hardening roadmap"}
1. Build a shared API foundation in `lib/api-utils.ts` (request IDs, response envelope, error mapping).
2. Add/standardize schema validation in all `app/api/**/route.ts` mutation handlers.
3. Refactor heavy route logic into `services/**` while preserving existing route signatures.
4. Introduce provider resilience (timeouts/retries/circuit-breakers) for LLM/payment/email integrations in corresponding service modules.
5. Add observability hooks (structured logs, latency/error counters) in route and service boundaries.
6. Add integration coverage for high-risk flows (auth, payment, chat) and gate merges with lint/build/tests.
7. Roll out by environment with canary controls and documented rollback checklist.
:::

### 8.6 Agentic chat feature implementation plan (frontend + backend)

:::task-stub{title="Implement full agentic chat stack with tool orchestration and secure action execution"}
1. Create backend routes: `POST /api/agents/chat`, `GET /api/agents/sessions/:id`, `POST /api/agents/actions`, `POST /api/agents/feedback`.
2. Define event protocol for SSE streaming (`token`, `tool_start`, `tool_result`, `final`, `error`) and keep event shapes versioned.
3. Persist chat entities (sessions/messages/tool_calls/tool_results/actions) via repository layer under `lib/repositories/` and associated DB adapters.
4. Update `app/chat/page.tsx` to consume streaming events and render state transitions (`queued`, `streaming`, `tool-running`, `completed`, `failed`) using existing RunAsh design patterns.
5. Add explicit user-confirmation UX for high-risk actions (payments/account-impacting operations).
6. Implement security controls: authenticated route access, per-user/IP throttling, prompt-injection detection, and sensitive-data redaction in logs.
7. Add performance/scalability controls: caching for frequent tool lookups, queue for long-running tools, and bounded concurrency limits.
8. Validate with `npm run lint`, `npm run build`, and targeted chat/API test suites before staged rollout.
:::

## Agent orchestration rollout plan

- Feature flag: `RUNASH_AGENT_CHAT_ENABLED` controls `/api/agents/*` activation.
- Rollout sequence: internal users -> beta cohort -> GA.
- Rollback: set flag to `false`, drain queued tool jobs, and continue serving existing non-agent chat routes.
- SLO monitoring targets:
  - error rate
  - first-token latency
  - tool failure rate

## 9) Deployment readiness artifacts (chat, streaming, attachments)

### 9.1 Required environment variables and secret management

Use environment-scoped secrets (`.env.local`, `.env.staging`, `.env.production`) with production values sourced from a secrets manager (e.g., Vercel/Cloud provider secret store) rather than committed files.

| Domain | Variable | Required | Purpose | Secret handling guidance |
| --- | --- | --- | --- | --- |
| Chat API | `RUNASH_AGENT_CHAT_ENABLED` | yes | Hard gate for agentic routes and staged rollout. | Non-secret feature flag; change only via controlled release change set. |
| Chat API | `RUNASH_CHAT_API_TIMEOUT_MS` | yes | Upper bound timeout for chat orchestration request lifecycle. | Non-secret config; must be consistent with upstream gateway timeout. |
| Streaming | `RUNASH_CHAT_STREAM_HEARTBEAT_MS` | yes | SSE heartbeat cadence to keep downstream clients connected. | Non-secret config; validate against load balancer idle timeout. |
| Streaming | `RUNASH_CHAT_STREAM_MAX_DURATION_MS` | yes | Max stream lifetime before server-side termination. | Non-secret config; required to avoid runaway streams. |
| Attachment storage | `RUNASH_ATTACHMENT_STORAGE_PROVIDER` | yes | Storage backend selector (`s3`, `gcs`, `r2`, etc.). | Non-secret selector; keep stable across release window. |
| Attachment storage | `RUNASH_ATTACHMENT_BUCKET` | yes | Bucket/container for chat attachments. | Non-secret identifier, but treat as infra-sensitive metadata. |
| Attachment storage | `RUNASH_ATTACHMENT_REGION` | yes | Region selection for attachment object storage. | Non-secret config. |
| Attachment storage | `RUNASH_ATTACHMENT_KMS_KEY_ID` | recommended | Customer-managed encryption key for attachments at rest. | Secret-adjacent; do not log values, rotate per policy. |
| Attachment storage | `RUNASH_ATTACHMENT_SIGNED_URL_TTL_SECONDS` | yes | Expiration for upload/download signed URLs. | Non-secret config; keep short (e.g., 300-900s). |
| Attachment storage | `RUNASH_ATTACHMENT_MAX_BYTES` | yes | Max allowed attachment size per object upload. | Non-secret policy control. |
| Credentials | `RUNASH_ATTACHMENT_ACCESS_KEY_ID` | yes | Object storage API credential ID. | **Secret**: store in manager, never in logs, rotate every 90 days. |
| Credentials | `RUNASH_ATTACHMENT_SECRET_ACCESS_KEY` | yes | Object storage API secret. | **Secret**: manager-only, no plaintext in CI logs or PRs. |

Secret management requirements:
1. No secret values in source, build logs, telemetry, or error payloads.
2. Rotate chat/attachment credentials on release cutover and after incidents.
3. Keep least-privilege IAM policy (bucket-scoped access, no wildcard admin).
4. Validate runtime secret injection with startup checks that fail closed.

### 9.2 Migration ordering + rollback for chat/attachment tables

Execution order for chat persistence and attachment support:
1. `scripts/sql/2026-02-11_create_runash_chat_session_tables.sql`
2. `scripts/sql/2026-02-28_create_runash_chat_attachment_tables.sql`

Rollback order (reverse):
1. `scripts/sql/2026-02-28_rollback_runash_chat_attachment_tables.sql`
2. (Optional, data-destructive) drop legacy chat tables only if full chat rollback is approved by Product + Backend + Security.

Operational rollback constraints:
- Attachment rollback is destructive for metadata; preserve object storage snapshots before executing rollback.
- If rollout fails after partial traffic shift, disable uploads first, drain in-flight streams, then execute rollback migration.

### 9.3 Blue/green + canary rollout for chat API changes

Release strategy:
1. **Blue deploy** remains current production baseline.
2. **Green deploy** introduces new chat API contract + attachment path behind `RUNASH_AGENT_CHAT_ENABLED=false` by default.
3. Run smoke checks on green (auth, chat send, stream token events, attachment upload metadata insert).
4. Enable feature flag for internal cohort (1-5% traffic via allowlist).
5. Progressive canary ramps: 10% -> 25% -> 50% -> 100%, with hold points at each stage.
6. Roll back immediately to blue if guardrail thresholds breach for 5 minutes.

Guardrail thresholds:
- `POST /api/chat` and `POST /api/agents/chat` 5xx rate > 1.5%
- p95 first-token latency > 3.0s
- Attachment upload error rate > 2.0%

### 9.4 SLO/SLA targets + incident response checklist

Chat service targets:
- **SLO: Availability** >= 99.9% monthly for chat send + stream-init endpoints.
- **SLO: First token latency** p95 <= 2.5s, p99 <= 4.0s.
- **SLO: Stream completion success** >= 99.5% (non-user-cancelled).
- **SLO: Attachment upload success** >= 99.0%.
- **Internal SLA: SEV-1 acknowledgment** <= 15 minutes, mitigation start <= 30 minutes.

Incident checklist for chat degradation:
1. Declare severity and assign incident commander.
2. Confirm blast radius (chat-only vs cross-service impact).
3. Freeze rollout and disable canary flag expansion.
4. If thresholds are exceeded, revert traffic to blue and disable new attachment uploads.
5. Capture timeline, request IDs, and affected cohort.
6. Validate recovery metrics for 30 minutes before resuming rollout.
7. Publish incident summary + follow-up action owners.

### 9.5 Backup and restore strategy (chat + attachments)

Data classes:
- **Relational metadata:** chat sessions/messages/attachment rows in Postgres.
- **Blob data:** binary attachments in object storage bucket.

Backup policy:
1. Postgres PITR enabled with daily full snapshot + 15-minute WAL archival.
2. Object storage versioning enabled on attachment bucket.
3. Daily bucket inventory report + integrity hash sampling for newly uploaded objects.
4. Cross-region replica for metadata snapshots and bucket replication (RPO target <= 15 minutes).

Restore runbook summary:
1. Restore database to incident timestamp into isolated recovery environment.
2. Restore object storage objects by prefix + version marker for impacted window.
3. Run integrity reconciliation query between `runash_chat_attachments` rows and object keys.
4. Repoint read-only verification job before restoring write traffic.
5. Obtain Backend + DevOps + Security go/no-go before full traffic restore.

### 9.6 Final go-live checklist with owner sign-offs

| Checklist item | Owner | Status (`pending`/`done`) | Sign-off name | Timestamp (UTC) |
| --- | --- | --- | --- | --- |
| Env vars + secrets present in staging/prod | DevOps | pending |  |  |
| Chat + attachment migrations applied in order | Backend | pending |  |  |
| Canary rollout plan approved and rehearsed | Backend + DevOps | pending |  |  |
| SLO dashboards + alerts active | SRE/DevOps | pending |  |  |
| Backup/restore dry run completed | DevOps + DBA | pending |  |  |
| Incident runbook reviewed with on-call | Engineering Manager | pending |  |  |
| Security review complete (secret handling + logging redaction) | Security | pending |  |  |
| Product launch approval for GA | Product | pending |  |  |
