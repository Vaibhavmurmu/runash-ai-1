# Live Orchestrator Rules

This service manages live session state, room lifecycle, product sequencing, and real-time coordination.

## Session model

Treat each session as a state machine.

States:
- draft
- scheduled
- provisioning
- ready
- live
- paused
- degraded
- ending
- ended
- post_processing
- failed

All transitions must be explicit and logged.

## Live loop

The main runtime loop should:

1. ingest viewer signals
2. interpret intent
3. retrieve trusted product context
4. ask the runtime for the next response/action
5. trigger overlays, captions, or CTAs
6. emit telemetry and events

## Latency rules

- Keep the live path non-blocking.
- Heavy work must be moved to workers.
- Do not block on analytics, clipping, or long retrieval.
- Design for reconnects, retries, and degraded modes.

## Supported features

- live video
- voice
- chat
- overlays
- product cards
- offers
- checkout prompts
- captions
- multilingual presentation

## Failure handling

If a subsystem fails:

- product knowledge failure → switch to safe generic messaging
- recommendation failure → use scheduled product order
- translation failure → continue in primary language
- commerce failure → suppress unsafe checkout CTA
- analytics failure → preserve raw events for later replay
