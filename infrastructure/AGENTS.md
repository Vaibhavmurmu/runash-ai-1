# Infrastructure Rules

RunAsh AI infrastructure must support realtime media, multi-agent execution, commerce reliability, and background processing.

## Core platform

Expect infrastructure for:
- containers
- orchestration
- queues/event bus
- caching
- observability
- secret management
- CDN/media delivery

## Reliability rules

Systems should support:
- horizontal scaling
- health checks
- retries
- dead-letter handling
- graceful degradation
- failover visibility

## Observability rules

All critical services should emit:
- structured logs
- metrics
- traces
- correlation IDs

## Deployment rules

Prefer safe rollouts for:
- payment services
- live session services
- agent runtime changes
- event schema changes
