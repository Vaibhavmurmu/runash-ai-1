# Agent Runtime Rules

This service runs the orchestrator and live agent execution logic for RunAsh AI.

## Purpose

Coordinate multi-agent decision-making during live commerce sessions while keeping latency low and behavior controllable.

## Core agents

- Orchestrator Agent
- AI Host Agent
- Product Knowledge Agent
- Recommendation Agent
- Conversation Intelligence Agent
- Commerce Agent
- Translation Agent
- Moderation Agent
- Analytics Agent

## Design model

Agents should follow:

- Perception
- Decision
- Action

Perception gathers chat, transcript, clicks, reactions, product state, and stream state.

Decision selects the next best action.

Action produces host responses, overlays, prompts, or CTAs.

## Coordination rules

- The orchestrator decides which agent acts next.
- Specialist agents should not directly control each other.
- Keep business truth outside prompts when possible.
- Use structured tool inputs and outputs.
- Prefer config-driven prompts over hardcoded prompt strings.

## AI host rules

The AI host should feel like a trustworthy live commerce presenter.

Tone:
- clear
- conversational
- energetic
- accurate

The host must never fabricate:
- product facts
- pricing
- discounts
- stock
- shipping
- returns or policy information

## Performance rules

- Keep the live response path low latency.
- Avoid expensive retrieval or deep reasoning in the hot path unless necessary.
- Use cached or pre-fetched context where possible.
- Degrade safely when a tool or dependency fails.

## Safety rules

- Final buyer-facing output should pass moderation/safety review when applicable.
- Never allow the agent layer to override authoritative commerce truth.
