# RunAsh AI — Repository Rules

RunAsh AI is a real-time AI-powered live commerce platform where AI hosts run shopping streams, interact with viewers, and drive purchases.

## Development Principles

- Prefer production-ready, maintainable code.
- Keep changes minimal and focused.
- Avoid breaking APIs unless explicitly requested.
- Reuse existing abstractions where possible.
- Avoid unnecessary dependencies.

## Code Changes

Run tests and linters for code changes.

Skip full test runs when modifying:
- comments
- documentation
- formatting

Always ensure:
- lint passes
- CI passes
- docs updated when APIs change

## Bra
nch Naming

Branch format:

You are working on RunAsh AI.

RunAsh AI is a cloud-based agentic live retail streaming automation platform where AI agents host live shopping sessions, interact with buyers in real time, present products, answer questions, generate clips, support multilingual voice interaction, and drive real purchases using integrated commerce infrastructure.

The system includes live streaming, AI agents, real-time chat, translation, product recommendations, analytics, and payment infrastructure including RunAsh Pay, Pay Link instant checkout, wallet, and payouts.

All code, architecture, and behavior must assume this is a production-scale distributed commerce and realtime media platform.

--------------------------------------------------

GENERAL DEVELOPMENT RULES

• Prefer production-grade implementations.
• Keep code modular, safe, and maintainable.
• Avoid breaking APIs unless explicitly requested.
• Reuse existing abstractions before introducing new patterns.
• Avoid unnecessary dependencies.
• Ensure code is observable, testable, and scalable.
• Optimize for realtime performance and reliability.

--------------------------------------------------

REPOSITORY RULES

Run tests and linters for every code change.

Skip full test runs when modifying:
• comments
• documentation
• formatting

Ensure:
• lint passes
• CI passes
• docs updated when APIs change

--------------------------------------------------

BRANCH NAMING RULES

Branch format:

codex/{feature}

Examples:

codex/live-streaming-engine
codex/runash-pay-link
codex/realtime-translation
codex/video-clips-pipeline

Allowed tags:

{feature}
{date}
{time}

Example dynamic branches:

codex/{feature}-{date}
codex/{feature}-{time}

--------------------------------------------------

DIFF DISPLAY FORMAT

Always show code changes in unified diff format.

--------------------------------------------------

RUNASH AI PLATFORM COMPONENTS

The platform includes:

AI and agent systems
• Agent orchestration engine
• AI live host
• conversation intelligence
• recommendation engine
• seller copilot

Live media systems
• live streaming engine
• WebRTC media infrastructure
• voice pipeline
• captions pipeline
• video clip generator

Commerce infrastructure
• RunAsh Pay
• Pay Link instant checkout
• wallet ledger
• order processing
• creator payouts

Experience systems
• seller dashboard
• viewer chat
• product overlays
• campaign management

Data and analytics
• event pipeline
• analytics engine
• experimentation system

--------------------------------------------------

DEFAULT TECHNOLOGY STACK

Backend

Python
FastAPI
Node.js
PostgreSQL
Redis
Kafka

Frontend

Next.js
TypeScript
WebSockets

Realtime media

WebRTC
LiveKit-style architecture
FFmpeg media pipelines

Infrastructure

Docker
Kubernetes
CDN media delivery

--------------------------------------------------

AI AGENT ARCHITECTURE

Agents follow three layers.

Perception Layer
Collect signals from chat, transcript, reactions, clicks, and session state.

Decision Layer
Determine the best next action using recommendation, commerce, and conversation intelligence.

Action Layer
Generate host responses, overlays, checkout triggers, and presentation actions.

Agents must never hallucinate:

• product price
• stock level
• shipping information
• payment details
• policy claims

All commerce facts must come from trusted system sources.

--------------------------------------------------

AI LIVE VIDEO WORKFLOW

Treat every live stream as a structured lifecycle pipeline.

SESSION LIFECYCLE

1 Pre-live setup

Prepare:

• product queue
• AI host persona
• campaign rules
• stream room
• translation services
• moderation pipeline

Validate:

• inventory
• pricing
• seller permissions
• checkout configuration

2 Session start

Initialize:

• video room
• event channels
• chat pipeline
• AI host controller
• analytics telemetry

Emit session-start events.

3 Live presentation loop

AI host:

• introduces products
• narrates features
• triggers overlays
• highlights offers

Synchronize:

• video
• speech
• captions
• product cards
• promotion overlays

4 Realtime interaction loop

Process viewer signals:

• chat
• reactions
• clicks
• questions
• purchase intent

Conversation intelligence interprets intent.

AI host answers questions and triggers offers.

5 Transaction loop

Surface checkout via RunAsh Pay Link.

Validate:

• price
• currency
• discount
• stock

Emit events:

• CTA shown
• checkout opened
• payment succeeded
• payment failed

6 Post-live processing

Generate:

• transcripts
• highlights
• clips
• analytics
• seller insights

--------------------------------------------------

LIVE VIDEO DESIGN RULES

Treat sessions as a state machine.

Session states:

scheduled  
provisioning  
ready  
live  
degraded  
paused  
ending  
ended  
post_processing  

All state transitions must be logged.

Heavy operations must run asynchronously.

--------------------------------------------------

REALTIME STREAMING RULES

Optimize for:

• low latency
• horizontal scaling
• session resilience

Support:

• live video
• voice
• chat
• overlays
• product cards
• realtime offers

--------------------------------------------------

MULTILINGUAL SUPPORT

Support English and Hindi.

Capabilities:

• speech recognition
• translation
• captions
• multilingual chat responses

Preserve accuracy of:

• product names
• prices
• brand terms
• discounts

--------------------------------------------------

VIDEO CLIP PIPELINE

Use asynchronous jobs.

Pipeline stages:

• clip detection
• trimming
• caption generation
• transcoding
• storage
• distribution

Track job status and retries.

--------------------------------------------------

PAYMENTS RULES — RUNASH PAY

Payments are correctness-critical.

Always enforce:

• idempotent payment requests
• webhook signature validation
• secure checkout links
• immutable transaction records
• append-only wallet ledger

Never trust client-side pricing.

--------------------------------------------------

SECURITY RULES

Always enforce:

• authentication
• authorization
• tenant isolation
• rate limiting
• signed URLs
• secret management

Never log secrets or payment data.

--------------------------------------------------

OBSERVABILITY

All services must include:

• structured logging
• metrics
• tracing
• error monitoring

Correlate events using:

• seller_id
• session_id
• stream_id
• product_id
• payment_id

--------------------------------------------------

PERFORMANCE RULES

Optimize for:

• low-latency interaction
• realtime stability
• scalable event processing

Avoid blocking operations.

Use async workers and event pipelines.

--------------------------------------------------

API DESIGN RULES

• version APIs
• validate schemas
• maintain backward compatibility
• support idempotency keys

--------------------------------------------------

TESTING RULES

Add tests for:

• session lifecycle transitions
• realtime events
• payment flows
• wallet ledger correctness
• clip generation
• multilingual routing

--------------------------------------------------

MULTI-AGENT SYSTEM

RunAsh AI uses a coordinated agent system.

Core agents:

Orchestrator Agent  
AI Host Agent  
Product Knowledge Agent  
Recommendation Agent  
Conversation Intelligence Agent  
Commerce Agent  
Translation Agent  
Moderation Agent  
Clip Generation Agent  
Analytics Agent  
Seller Copilot Agent  

The orchestrator coordinates all agent interactions.

--------------------------------------------------

AI HOST SYSTEM PROMPT

The AI Host behaves like a professional live commerce presenter.

Responsibilities:

• introduce products
• explain product value
• answer buyer questions
• encourage interaction
• guide buyers toward checkout

Tone:

• friendly
• energetic
• conversational
• trustworthy

Rules:

• never fabricate product information
• never guess prices or policies
• rely on product knowledge agent for facts
• respond politely to chat
• maintain session energy
• smoothly transition between products

--------------------------------------------------

AGENT DECISION LOOP

During live sessions:

1 Perceive  
Collect chat, transcript, reactions, clicks, and stream state.

2 Interpret  
Conversation Intelligence classifies intent.

3 Retrieve facts  
Product Knowledge retrieves trusted data.

4 Decide  
Recommendation and Commerce agents determine next action.

5 Generate response  
AI Host drafts reply.

6 Safety check  
Moderation validates output.

7 Deliver  
Voice system delivers speech and captions.

8 Observe  
Analytics measures viewer reaction.

--------------------------------------------------

MEMORY ARCHITECTURE

Session memory
Stores current stream context.

Seller memory
Stores seller preferences and brand style.

Catalog memory
Stores product facts and pricing.

Performance memory
Stores analytics and optimization insights.

--------------------------------------------------

EVENT SYSTEM

Important events include:

session.created  
session.started  
product.changed  
question.received  
answer.delivered  
offer.revealed  
cta.shown  
checkout.opened  
payment.succeeded  
clip.generated  
session.ended  

Events must include correlation identifiers.

--------------------------------------------------

FALLBACK MODES

If product data fails:

Use safe generic language.

If translation fails:

Continue in primary language.

If recommendation fails:

Use scheduled product order.

If commerce services fail:

Hide checkout CTA until restored.

--------------------------------------------------

DOCUMENTATION RULES

Always update:

• README
• API documentation
• architecture notes
• environment variable docs

--------------------------------------------------

DO NOT

• break APIs silently
• hardcode secrets
• trust client pricing
• block realtime pipelines
• hallucinate commerce facts
• mix unrelated refactors

--------------------------------------------------

OUTPUT STYLE

• show code changes in unified diff format
• provide concise explanations
• highlight migrations or config changes
