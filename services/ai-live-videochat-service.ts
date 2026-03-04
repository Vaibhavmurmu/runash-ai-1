import { randomUUID } from "node:crypto"
import { getSql } from "@/lib/db/neon"

export type LiveChatRole = "seller" | "buyer" | "assistant"
export type SessionStatus = "active" | "ended"

export type LiveChatSession = {
  id: string
  sellerUserId: number
  status: SessionStatus
  title: string
  createdAt: string
  startedAt: string
  endedAt: string | null
}

type SessionParticipant = {
  id: string
  sessionId: string
  role: LiveChatRole
  userId: number | null
  displayName: string | null
  joinedAt: string
  leftAt: string | null
}

type RoutedMediaEvent = {
  id: string
  sessionId: string
  actorRole: LiveChatRole
  actorUserId: number | null
  eventType: string
  payload: Record<string, unknown>
  latencyMs: number | null
  createdAt: string
}

type CreateSessionInput = {
  sellerUserId: number
  title?: string
}

type JoinSessionInput = {
  sessionId: string
  role: LiveChatRole
  userId: number | null
  displayName?: string
}

type LeaveSessionInput = {
  sessionId: string
  role: LiveChatRole
  userId: number | null
}

type AssistantTurnInput = {
  sessionId: string
  actorRole: Extract<LiveChatRole, "seller" | "buyer">
  actorUserId: number
  message: string
}

const prohibitedPhrases = ["credit card number", "cvv", "social security number", "bank account password"]

function fallbackAssistantReply(role: "seller" | "buyer") {
  if (role === "buyer") {
    return "I can help summarize product details and guide next steps while our AI assistant reconnects."
  }
  return "AI assistant is temporarily unavailable. Please continue with key product benefits, pricing, and delivery terms."
}

export class AiLiveVideoChatService {
  private static instance: AiLiveVideoChatService
  private readonly hotEventBuffer = new Map<string, RoutedMediaEvent[]>()

  public static getInstance() {
    if (!AiLiveVideoChatService.instance) {
      AiLiveVideoChatService.instance = new AiLiveVideoChatService()
    }
    return AiLiveVideoChatService.instance
  }

  async createSession(input: CreateSessionInput): Promise<LiveChatSession> {
    const sql = getSql()
    const sessionId = randomUUID()

    const [created] = await sql/* sql */`
      INSERT INTO ai_live_chat_sessions (id, seller_user_id, title, status, started_at)
      VALUES (${sessionId}, ${input.sellerUserId}, ${input.title ?? "Live AI Sales Session"}, 'active', NOW())
      RETURNING id, seller_user_id, status, title, created_at, started_at, ended_at
    `

    await this.recordEvent({
      sessionId,
      actorRole: "seller",
      actorUserId: input.sellerUserId,
      eventType: "session_created",
      payload: { title: created.title },
      latencyMs: null,
    })

    return {
      id: created.id,
      sellerUserId: Number(created.seller_user_id),
      status: created.status,
      title: created.title,
      createdAt: created.created_at,
      startedAt: created.started_at,
      endedAt: created.ended_at,
    }
  }

  async joinSession(input: JoinSessionInput): Promise<SessionParticipant> {
    const sql = getSql()
    const participantId = randomUUID()

    const [participant] = await sql/* sql */`
      INSERT INTO ai_live_chat_session_participants (id, session_id, role, user_id, display_name)
      VALUES (${participantId}, ${input.sessionId}, ${input.role}, ${input.userId}, ${input.displayName ?? null})
      RETURNING id, session_id, role, user_id, display_name, joined_at, left_at
    `

    await this.recordEvent({
      sessionId: input.sessionId,
      actorRole: input.role,
      actorUserId: input.userId,
      eventType: "session_join",
      payload: { displayName: input.displayName ?? null },
      latencyMs: null,
    })

    return {
      id: participant.id,
      sessionId: participant.session_id,
      role: participant.role,
      userId: participant.user_id ? Number(participant.user_id) : null,
      displayName: participant.display_name,
      joinedAt: participant.joined_at,
      leftAt: participant.left_at,
    }
  }

  async leaveSession(input: LeaveSessionInput) {
    const sql = getSql()

    await sql/* sql */`
      UPDATE ai_live_chat_session_participants
      SET left_at = NOW()
      WHERE session_id = ${input.sessionId}
        AND role = ${input.role}
        AND (
          (${input.userId} IS NULL AND user_id IS NULL)
          OR user_id = ${input.userId}
        )
        AND left_at IS NULL
    `

    await this.recordEvent({
      sessionId: input.sessionId,
      actorRole: input.role,
      actorUserId: input.userId,
      eventType: "session_leave",
      payload: {},
      latencyMs: null,
    })
  }

  async endSession(sessionId: string, endedByUserId: number) {
    const sql = getSql()

    const [ended] = await sql/* sql */`
      UPDATE ai_live_chat_sessions
      SET status = 'ended', ended_at = NOW(), updated_at = NOW()
      WHERE id = ${sessionId}
      RETURNING id, seller_user_id, status, title, created_at, started_at, ended_at
    `

    await sql/* sql */`
      UPDATE ai_live_chat_session_participants
      SET left_at = NOW()
      WHERE session_id = ${sessionId}
        AND left_at IS NULL
    `

    await this.recordEvent({
      sessionId,
      actorRole: "seller",
      actorUserId: endedByUserId,
      eventType: "session_ended",
      payload: {},
      latencyMs: null,
    })

    if (!ended) return null

    return {
      id: ended.id,
      sellerUserId: Number(ended.seller_user_id),
      status: ended.status,
      title: ended.title,
      createdAt: ended.created_at,
      startedAt: ended.started_at,
      endedAt: ended.ended_at,
    } as LiveChatSession
  }

  async routeMediaEvent(input: {
    sessionId: string
    actorRole: LiveChatRole
    actorUserId: number | null
    eventType: "audio" | "video" | "presence"
    payload: Record<string, unknown>
    latencyMs?: number
  }) {
    return this.recordEvent({
      sessionId: input.sessionId,
      actorRole: input.actorRole,
      actorUserId: input.actorUserId,
      eventType: `media_${input.eventType}`,
      payload: input.payload,
      latencyMs: input.latencyMs ?? null,
    })
  }

  async assistantTurn(input: AssistantTurnInput) {
    const normalized = input.message.trim()

    if (!normalized) {
      return { blocked: true as const, reason: "Message is empty", reply: null, fallbackUsed: false }
    }

    const lowered = normalized.toLowerCase()
    const blockedPhrase = prohibitedPhrases.find((phrase) => lowered.includes(phrase))

    if (blockedPhrase) {
      await this.recordEvent({
        sessionId: input.sessionId,
        actorRole: input.actorRole,
        actorUserId: input.actorUserId,
        eventType: "assistant_turn_blocked",
        payload: { blockedPhrase },
        latencyMs: null,
        prohibitedContent: true,
      })
      return {
        blocked: true as const,
        reason: "Message contains prohibited content",
        reply: "I can’t assist with sensitive personal or payment credentials. Please keep the conversation product-focused.",
        fallbackUsed: false,
      }
    }

    const generated = await this.generateAssistantReply({ message: normalized, role: input.actorRole, sessionId: input.sessionId })

    await this.recordEvent({
      sessionId: input.sessionId,
      actorRole: "assistant",
      actorUserId: null,
      eventType: "assistant_turn_completed",
      payload: { reply: generated.reply },
      latencyMs: generated.latencyMs,
      fallbackUsed: generated.fallbackUsed,
    })

    return { blocked: false as const, reason: null, reply: generated.reply, fallbackUsed: generated.fallbackUsed }
  }

  getRecentRoutedEvents(sessionId: string) {
    return this.hotEventBuffer.get(sessionId) ?? []
  }

  private async generateAssistantReply(input: { message: string; role: "seller" | "buyer"; sessionId: string }) {
    const started = Date.now()
    const endpoint = process.env.RUNASH_LIVE_CHAT_AI_ENDPOINT?.trim()

    if (!endpoint) {
      return { reply: fallbackAssistantReply(input.role), fallbackUsed: true, latencyMs: Date.now() - started }
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: input.sessionId, role: input.role, message: input.message }),
        signal: AbortSignal.timeout(4500),
      })

      if (!response.ok) throw new Error("AI endpoint unavailable")

      const payload = (await response.json()) as { reply?: string }
      const reply = payload.reply?.trim()

      return {
        reply: reply || fallbackAssistantReply(input.role),
        fallbackUsed: !reply,
        latencyMs: Date.now() - started,
      }
    } catch {
      return { reply: fallbackAssistantReply(input.role), fallbackUsed: true, latencyMs: Date.now() - started }
    }
  }

  private async recordEvent(input: {
    sessionId: string
    actorRole: LiveChatRole
    actorUserId: number | null
    eventType: string
    payload: Record<string, unknown>
    latencyMs: number | null
    prohibitedContent?: boolean
    fallbackUsed?: boolean
  }) {
    const sql = getSql()
    const eventId = randomUUID()

    const [event] = await sql/* sql */`
      INSERT INTO ai_live_chat_events (
        id,
        session_id,
        actor_role,
        actor_user_id,
        event_type,
        payload,
        latency_ms,
        prohibited_content,
        ai_fallback_used
      )
      VALUES (
        ${eventId},
        ${input.sessionId},
        ${input.actorRole},
        ${input.actorUserId},
        ${input.eventType},
        ${JSON.stringify(input.payload)},
        ${input.latencyMs},
        ${Boolean(input.prohibitedContent)},
        ${Boolean(input.fallbackUsed)}
      )
      RETURNING id, session_id, actor_role, actor_user_id, event_type, payload, latency_ms, created_at
    `

    const routed: RoutedMediaEvent = {
      id: event.id,
      sessionId: event.session_id,
      actorRole: event.actor_role,
      actorUserId: event.actor_user_id ? Number(event.actor_user_id) : null,
      eventType: event.event_type,
      payload: event.payload ?? {},
      latencyMs: event.latency_ms,
      createdAt: event.created_at,
    }

    const current = this.hotEventBuffer.get(input.sessionId) ?? []
    this.hotEventBuffer.set(input.sessionId, [...current, routed].slice(-120))

    return routed
  }
}
