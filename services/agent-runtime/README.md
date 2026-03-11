# Agent Runtime

Runs the core multi-agent orchestration logic for RunAsh AI live commerce sessions.

## Responsibilities

- orchestrate specialist agents
- manage live response generation
- enforce decision sequencing
- support low-latency buyer-facing behavior
- apply safety and tool-usage boundaries

## Key dependencies

- product-knowledge
- commerce
- moderation
- translation
- analytics
- live-orchestrator

## Notes

Do not hardcode large prompt blobs in application code. Use versioned prompt assets from `prompts/`.
