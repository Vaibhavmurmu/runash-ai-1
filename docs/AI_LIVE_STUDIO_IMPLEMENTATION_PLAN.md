
# AI-Powered Browser Live Studio — Next Task Plan (Execution-Ready)

This document is the actionable execution plan for shipping a production-ready RunAsh AI browser live streaming studio.

## 1) Mission + Product Outcomes

Build a browser-based live studio with:
- multi-device streaming (desktop/mobile/tablet),
- multi-format output (horizontal + vertical),
- realtime audience interactivity (chat, polls, Q&A, reactions),
- creator controls (live control room + compact panel),
- AI assistance (moderation, captions, highlights, analytics),
- monetization (memberships, donations, super chat-like events),
- durable media/archive workflows.

Success is measured by:
1. reliable go-live to end-stream lifecycle,
2. policy-compliant privacy defaults,
3. low-latency interaction paths,
4. operational observability and rollback safety.

---

## 2) Current State Snapshot (Repository)

Already present:
- Studio surfaces and control UI foundations in `components/streaming/*`.
- Dashboard stream APIs under `app/api/dashboard/streams/*`.
- Stream interaction endpoints under `app/api/streams/:id/*`.
- Live control domain model in `lib/types/stream-live-control.ts` and repository logic in `lib/repositories/stream-live-control.ts`.

Gaps to close next:
- contract consistency between dashboard/live-control and stream interactions,
- stronger moderation and access control for interactive actions,
- end-to-end analytics + persistence for interactivity,
- dual-stream and media lifecycle completion,
- production hardening and CI validation depth.

---

## 3) Workstreams and Ordered Milestones

## Milestone A — Contract & Domain Consolidation (Week 1)

### A1. Unified API contracts
- Define canonical payloads for:
  - stream lifecycle (`create/start/end`),
  - interactions (`polls`, `qna`, `reactions`, `pinning`),
  - live control (`visibility`, `members-only`, `dual-stream`, `trailer`).
- Standardize success/error envelope shape for new/updated routes.
- Add request correlation-id propagation across stream APIs.

### A2. Authorization model hardening
- Enforce role-based rules:
  - host/moderator vs viewer actions,
  - member-only action constraints,
  - per-stream ownership checks.
- Add explicit permission checks for:
  - ending polls,
  - selecting Q&A,
  - pin/unpin message,
  - toggling members-only mode.

### A3. Schema + migration alignment
- Add/update SQL migrations for durable interaction data:
  - polls/poll options/poll votes,
  - qna sessions/questions/selections,
  - reaction event aggregates,
  - moderation actions audit log.

**Exit criteria:** no contract drift, documented schemas, host-only actions enforced.

---

## Milestone B — Live Control Room Completeness (Week 2)

### B1. Go-live control workflow
- Complete studio flow states:
  - preflight checks,
  - camera/mic picker,
  - title/description/privacy,
  - thumbnail capture,
  - go live / end stream transitions.

### B2. Compact pop-out panel parity
- Ensure compact panel includes critical controls:
  - stream health,
  - viewership metrics,
  - monetization counters,
  - pinned message + active poll/Q&A snapshot.

### B3. Scheduling + trailer integration
- Add scheduled stream metadata UX and route support:
  - schedule date/time,
  - trailer attach/replace/remove,
  - launch scheduled stream from manage tab.

**Exit criteria:** full control-room lifecycle (scheduled → live → ended) works via browser only.

---

## Milestone C — Interactivity + AI Operations (Week 3)

### C1. Chat moderation pipeline
- Add moderation decision service layer:
  - profanity/toxicity checks,
  - auto-hide/escalate flags,
  - moderator override events.

### C2. Polls/Q&A realtime integrity
- Upgrade stream interaction endpoints for:
  - idempotency keys on write actions,
  - anti-spam/rate-limits,
  - optimistic UI rollback support.

### C3. AI features
- Captions/transcription attach to stream session.
- AI stream highlights and post-stream summary generation.
- AI title/tag suggestions surfaced in Studio settings.

**Exit criteria:** interaction features are resilient, auditable, and observable in realtime.

---

## Milestone D — Dual Stream + Monetization + Archive (Week 4)

### D1. Dual-stream control plane
- Persist dual mode config (16:9 + 9:16) with linked stream identity.
- Ensure shared chat and unified metrics path.
- Add validation for orientation-specific constraints.

### D2. Monetization events
- Add stream monetization event model:
  - donations,
  - membership events,
  - highlighted paid messages.
- Surface monetization totals in control room + analytics.

### D3. VOD/clip/archive lifecycle
- Finalize archive flow:
  - auto-archive under threshold duration,
  - replay indexing,
  - clip extraction metadata.

**Exit criteria:** creators can run, monetize, and archive complete stream lifecycle.

---

## 4) Detailed Backlog (Priority Ordered)

P0 (do now)
1. Align interaction action permissions by user role.
2. Add migration-backed persistence for poll votes and Q&A selection events.
3. Normalize API error codes in `/api/streams/:id/*` routes.
4. Add stream interaction integration tests for host/viewer authorization paths.
5. Implement compact panel data contract endpoint.

P1 (next)
6. Integrate trailer metadata controls with dashboard live-control save path.
7. Add member-only chat gating in interaction read/write routes.
8. Add reaction event ingest and aggregate counters.
9. Add AI moderation signal endpoint + UI warning badges.
10. Add dual stream dashboard validation and telemetry views.

P2 (hardening)
11. Add rate-limits for poll votes/question submits.
12. Add idempotency for action endpoints.
13. Add incident runbook and rollback docs for live-control failures.
14. Add synthetic checks for `/stream` and critical API health.
15. Expand CI job matrix (unit + route + smoke E2E).

---

## 5) API Surface (Target)

### Control plane
- `GET/PUT /api/dashboard/streams/live-control/:id`
- `POST /api/dashboard/streams/live-control/:id/actions`

### Interaction plane
- `GET/PATCH /api/streams/:id/interactions`
- `GET/POST /api/streams/:id/polls`
- `POST /api/streams/:id/polls/:pollId/vote`
- `POST /api/streams/:id/polls/:pollId/end`
- `GET/POST /api/streams/:id/qa`
- `POST /api/streams/:id/qa/:sessionId/end`
- `GET/POST /api/streams/:id/qa/questions`
- `PATCH /api/streams/:id/qa/questions/:questionId`

### Analytics/health plane (to complete)
- `GET /api/streams/:id/health`
- `GET /api/streams/:id/metrics/realtime`
- `GET /api/streams/:id/metrics/summary`

---

## 6) Security, Compliance, and Reliability Checklist

- [ ] Creator-age visibility defaults enforced and documented.
- [ ] Sensitive content never logged (chat content, tokens, auth artifacts).
- [ ] Moderation actions are audit-logged with actor and timestamp.
- [ ] Role/ownership checks for all state-mutating stream routes.
- [ ] Rate limiting enabled for interaction write endpoints.
- [ ] Rollback steps documented for each high-risk route group.

---

## 7) Validation Strategy

Minimum local checks per merge:
- `npm run lint`
- `npm run build`
- target unit tests for changed modules
- route-level tests for touched API handlers

Additional recommended checks:
- stream interaction contract tests,
- authorization matrix tests (host/mod/viewer/member),
- smoke test for go-live flow routes.

---

## 8) Documentation Deliverables

Keep these docs synchronized during execution:
- `docs/API_CONTRACTS.md` (route contracts + examples),
- `docs/AI_LIVE_STUDIO_IMPLEMENTATION_PLAN.md` (this file),
- release notes for each shipped milestone,
- operational runbook for incidents and rollback.

# AI-Powered Browser Live Studio — Implementation Plan

This plan defines the production path for RunAsh browser-based live streaming studio across desktop/mobile/tablet.

## Scope

- Browser-first live studio (webcam, mic, screen share)
- Live control room and compact panel UX
- Dual stream formats (16:9 + 9:16)
- AI captions/moderation/highlights/analytics
- Chat, polls, Q&A, reactions, member-only workflows
- Monetization (super chat/memberships/donations)

## Architecture Baseline

### Frontend
- Next.js + React + TypeScript
- MediaDevices and WebRTC APIs
- SSE/WebSocket feeds for chat + metrics + interactions

### Backend
- Next.js route handlers for control-plane APIs
- Redis/Upstash for low-latency live interaction state
- PostgreSQL for durable entities (streams, schedules, archives, monetization)

### Data and Media
- PostgreSQL as source of truth for durable records
- Redis for fast fan-out, counters, and interaction snapshots
- Cloud object storage for VOD, thumbnails, trailers, clips

## Delivery Waves

### Wave 1: Foundation
1. Normalize stream/platform API contracts.
2. Replace simulated critical paths with server-backed state.
3. Implement full stream interactions API (polls, Q&A, reactions, member-only flags).
4. Add audit-safe logging and request correlation IDs.

### Wave 2: Control Room + Device Workflows
1. Build complete go-live flow with privacy/scheduling controls.
2. Device selection + quality presets + screen share controls.
3. Live control panel pop-out and metrics widgets.
4. Scheduled stream launch + manage tab lifecycle.

### Wave 3: AI + Monetization
1. Captions/transcription and moderation scoring.
2. AI suggestions: title/tags/highlights/summary.
3. Super chat, memberships, donations, revenue surfaces.
4. Member-only live mode and policy enforcement.

### Wave 4: Production Hardening
1. Rate limits, auth hardening, and abuse prevention.
2. VOD archive + trailer playback + clip workflows.
3. CI/CD gates (lint, build, tests), load tests, runbooks.
4. Monitoring, SLOs, rollback procedures.

## Immediate Implementation Notes

- New stream interactions APIs are added under `/api/streams/:id/...`.
- Poll and Q&A features now have backend endpoints for creation, voting, selection, and closure.
- The poll manager UI component has been replaced with a valid production-aligned component scaffold.

## Validation Baseline

Required checks before merge:

- `npm run lint`
- `npm run build`
- targeted route/component tests where modified


