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

