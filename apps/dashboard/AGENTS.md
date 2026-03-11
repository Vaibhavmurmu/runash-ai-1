# Dashboard Rules

This app is the seller-facing dashboard for RunAsh AI.

## Responsibilities

- schedule and manage live sessions
- manage product queues
- configure offers and campaigns
- monitor stream health
- review clips and analytics
- manage seller workflows

## UX rules

Prioritize:
- clarity
- speed
- trustworthy commerce state
- readable metrics
- responsive controls

## Realtime rules

Use realtime subscriptions or websockets where appropriate for:
- live session status
- chat summaries
- stream health
- conversions
- clip processing status

## Security rules

The dashboard must not trust client-side authority for:
- price
- stock
- eligibility
- payment state

Sensitive calculations must be validated server-side.
