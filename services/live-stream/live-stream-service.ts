import { queryMany } from "@/lib/db"
import { getLiveStreamProvider } from "@/services/live-stream/provider"
import { publishSessionStateChanged } from "@/services/realtime/publishers"
import type {
  LiveStreamEndpoint,
  LiveStreamEvent,
  LiveStreamEventsResponse,
  LiveStreamLatencyProfile,
  LiveStreamSession,
  LiveStreamSessionResponse,
  LiveStreamSessionStatus,
} from "@/types/live-stream-domain"

export class LiveStreamValidationError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = "LiveStreamValidationError"
    this.statusCode = statusCode
  }
}

type DbSessionRow = {
  id: string
  owner_user_id: number
  workspace_id: string | null
  title: string | null
  status: LiveStreamSessionStatus
  playback_urls: unknown
  dvr_enabled: boolean
  latency_profile: LiveStreamLatencyProfile
  failure_reason: string | null
  created_at: string
  updated_at: string
  starting_at: string | null
  live_at: string | null
  stopping_at: string | null
  ended_at: string | null
  failed_at: string | null
}

type DbEndpointRow = {
  id: string
  session_id: string
  provider: string
  ingest_url: string
  ingest_token_masked: string
  token_expires_at: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

type DbEventRow = {
  id: string
  session_id: string
  event_type: string
  from_status: LiveStreamSessionStatus | null
  to_status: LiveStreamSessionStatus
  actor_user_id: number | null
  idempotency_key: string | null
  reason: string | null
  payload: Record<string, unknown> | null
  occurred_at: string
}

type StateTransitionContext = {
  actorUserId: number
  idempotencyKey?: string
  reason?: string | null
  payload?: Record<string, unknown>
}

const ALLOWED_TRANSITIONS: Record<LiveStreamSessionStatus, LiveStreamSessionStatus[]> = {
  draft: ["starting", "ended", "failed"],
  starting: ["live", "failed", "stopping"],
  live: ["stopping", "failed"],
  stopping: ["ended", "failed"],
  ended: [],
  failed: ["starting", "stopping"],
}

function toSession(row: DbSessionRow, endpoint: DbEndpointRow | null): LiveStreamSession {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    workspaceId: row.workspace_id,
    title: row.title,
    status: row.status,
    playbackUrls: Array.isArray(row.playback_urls) ? (row.playback_urls as LiveStreamSession["playbackUrls"]) : [],
    dvrEnabled: row.dvr_enabled,
    latencyProfile: row.latency_profile,
    ingestEndpoint: endpoint ? toEndpoint(endpoint) : null,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startingAt: row.starting_at,
    liveAt: row.live_at,
    stoppingAt: row.stopping_at,
    endedAt: row.ended_at,
    failedAt: row.failed_at,
  }
}

function toEndpoint(row: DbEndpointRow): LiveStreamEndpoint {
  return {
    id: row.id,
    sessionId: row.session_id,
    provider: row.provider,
    ingestUrl: row.ingest_url,
    ingestTokenMasked: row.ingest_token_masked,
    tokenExpiresAt: row.token_expires_at,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toEvent(row: DbEventRow): LiveStreamEvent {
  return {
    id: row.id,
    sessionId: row.session_id,
    eventType: row.event_type,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    actorUserId: row.actor_user_id,
    idempotencyKey: row.idempotency_key,
    reason: row.reason,
    payload: row.payload ?? {},
    occurredAt: row.occurred_at,
  }
}

async function getLatestEndpoint(sessionId: string): Promise<DbEndpointRow | null> {
  const rows = await queryMany<DbEndpointRow>(
    `
      select id, session_id, provider, ingest_url, ingest_token_masked, token_expires_at, metadata, created_at, updated_at
      from live_stream_endpoints
      where session_id = $1
      order by created_at desc
      limit 1
    `,
    [sessionId],
  )

  return rows[0] ?? null
}

async function getSessionRow(sessionId: string): Promise<DbSessionRow | null> {
  const rows = await queryMany<DbSessionRow>(
    `
      select id, owner_user_id, workspace_id, title, status, playback_urls, dvr_enabled, latency_profile,
             failure_reason, created_at, updated_at, starting_at, live_at, stopping_at, ended_at, failed_at
      from live_stream_sessions
      where id = $1
      limit 1
    `,
    [sessionId],
  )

  return rows[0] ?? null
}

async function assertOwnership(sessionId: string, actorUserId: number): Promise<DbSessionRow> {
  const session = await getSessionRow(sessionId)
  if (!session) {
    throw new LiveStreamValidationError("Live stream session not found", 404)
  }

  if (session.owner_user_id !== actorUserId) {
    throw new LiveStreamValidationError("Forbidden", 403)
  }

  return session
}

async function appendEvent(
  sessionId: string,
  eventType: string,
  fromStatus: LiveStreamSessionStatus | null,
  toStatus: LiveStreamSessionStatus,
  context: StateTransitionContext,
) {
  await queryMany(
    `
      insert into live_stream_events (
        session_id, event_type, from_status, to_status, actor_user_id, idempotency_key, reason, payload
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
    `,
    [
      sessionId,
      eventType,
      fromStatus,
      toStatus,
      context.actorUserId,
      context.idempotencyKey ?? null,
      context.reason ?? null,
      JSON.stringify(context.payload ?? {}),
    ],
  )
}

async function transitionSessionStatus(
  session: DbSessionRow,
  toStatus: LiveStreamSessionStatus,
  context: StateTransitionContext,
): Promise<DbSessionRow> {
  const allowed = ALLOWED_TRANSITIONS[session.status]
  if (!allowed.includes(toStatus)) {
    throw new LiveStreamValidationError(`Invalid state transition from ${session.status} to ${toStatus}`, 409)
  }

  const timestampFieldByStatus: Partial<Record<LiveStreamSessionStatus, string>> = {
    starting: "starting_at",
    live: "live_at",
    stopping: "stopping_at",
    ended: "ended_at",
    failed: "failed_at",
  }

  const timestampField = timestampFieldByStatus[toStatus]
  const assignments = ["status = $2", "updated_at = now()"]
  const params: unknown[] = [session.id, toStatus]

  if (toStatus === "failed") {
    params.push(context.reason ?? "Unknown failure")
    assignments.push(`failure_reason = $${params.length}`)
  } else {
    assignments.push("failure_reason = null")
  }

  if (timestampField) {
    assignments.push(`${timestampField} = now()`)
  }

  const rows = await queryMany<DbSessionRow>(
    `
      update live_stream_sessions
      set ${assignments.join(", ")}
      where id = $1
      returning id, owner_user_id, workspace_id, title, status, playback_urls, dvr_enabled, latency_profile,
                failure_reason, created_at, updated_at, starting_at, live_at, stopping_at, ended_at, failed_at
    `,
    params,
  )

  const updated = rows[0]
  if (!updated) {
    throw new LiveStreamValidationError("Live stream session not found", 404)
  }

  await appendEvent(session.id, "state_transition", session.status, toStatus, context)
  publishSessionStateChanged({
    sessionId: session.id,
    previousStatus: session.status,
    status: toStatus,
    occurredAt: updated.updated_at,
    actorUserId: context.actorUserId ?? null,
    reason: context.reason ?? null,
  })

  return updated
}

async function lookupIdempotentResponse(
  sessionId: string,
  operation: "start" | "stop",
  idempotencyKey: string,
): Promise<LiveStreamSessionResponse | null> {
  const rows = await queryMany<{ response_payload: LiveStreamSessionResponse }>(
    `
      select response_payload
      from live_stream_command_idempotency
      where session_id = $1 and operation = $2 and idempotency_key = $3
      limit 1
    `,
    [sessionId, operation, idempotencyKey],
  )

  return rows[0]?.response_payload ?? null
}

async function persistIdempotentResponse(
  sessionId: string,
  operation: "start" | "stop",
  idempotencyKey: string,
  response: LiveStreamSessionResponse,
) {
  await queryMany(
    `
      insert into live_stream_command_idempotency (session_id, operation, idempotency_key, response_payload)
      values ($1, $2, $3, $4::jsonb)
      on conflict (session_id, operation, idempotency_key)
      do update set response_payload = excluded.response_payload
    `,
    [sessionId, operation, idempotencyKey, JSON.stringify(response)],
  )
}

export class LiveStreamService {
  async createDraftSession(input: {
    ownerUserId: number
    workspaceId?: string | null
    title?: string | null
    dvrEnabled?: boolean
    latencyProfile?: LiveStreamLatencyProfile
  }): Promise<LiveStreamSessionResponse> {
    const rows = await queryMany<DbSessionRow>(
      `
        insert into live_stream_sessions (
          owner_user_id,
          workspace_id,
          title,
          status,
          playback_urls,
          dvr_enabled,
          latency_profile
        )
        values ($1, $2, $3, 'draft', '[]'::jsonb, $4, $5)
        returning id, owner_user_id, workspace_id, title, status, playback_urls, dvr_enabled, latency_profile,
                  failure_reason, created_at, updated_at, starting_at, live_at, stopping_at, ended_at, failed_at
      `,
      [input.ownerUserId, input.workspaceId ?? null, input.title ?? null, input.dvrEnabled ?? true, input.latencyProfile ?? "normal"],
    )

    const session = rows[0]
    if (!session) throw new LiveStreamValidationError("Failed to create live stream session", 500)

    await appendEvent(session.id, "session_created", null, "draft", {
      actorUserId: input.ownerUserId,
      payload: { workspaceId: input.workspaceId ?? null },
    })

    return { session: toSession(session, null) }
  }

  async getSession(input: { sessionId: string; actorUserId: number }): Promise<LiveStreamSessionResponse> {
    const row = await assertOwnership(input.sessionId, input.actorUserId)
    const endpoint = await getLatestEndpoint(input.sessionId)
    return { session: toSession(row, endpoint) }
  }

  async startSession(input: {
    sessionId: string
    actorUserId: number
    idempotencyKey: string
  }): Promise<LiveStreamSessionResponse> {
    const existing = await lookupIdempotentResponse(input.sessionId, "start", input.idempotencyKey)
    if (existing) return existing

    let session = await assertOwnership(input.sessionId, input.actorUserId)
    if (session.status === "live" || session.status === "starting") {
      const endpoint = await getLatestEndpoint(input.sessionId)
      const response = { session: toSession(session, endpoint) }
      await persistIdempotentResponse(input.sessionId, "start", input.idempotencyKey, response)
      return response
    }

    session = await transitionSessionStatus(session, "starting", {
      actorUserId: input.actorUserId,
      idempotencyKey: input.idempotencyKey,
      reason: "Start requested",
    })

    try {
      const provider = getLiveStreamProvider()
      const provisioned = await provider.provision({
        sessionId: input.sessionId,
        ownerUserId: session.owner_user_id,
        workspaceId: session.workspace_id,
        dvrEnabled: session.dvr_enabled,
        latencyProfile: session.latency_profile,
      })

      await queryMany(
        `
          insert into live_stream_endpoints (
            session_id,
            provider,
            ingest_url,
            ingest_token_masked,
            token_expires_at,
            metadata
          )
          values ($1, $2, $3, $4, $5, $6::jsonb)
        `,
        [
          input.sessionId,
          provisioned.provider,
          provisioned.ingestUrl,
          `${provisioned.ingestToken.slice(0, 4)}***${provisioned.ingestToken.slice(-4)}`,
          provisioned.tokenExpiresAt,
          JSON.stringify(provisioned.metadata),
        ],
      )

      const liveRows = await queryMany<DbSessionRow>(
        `
          update live_stream_sessions
          set playback_urls = $2::jsonb,
              updated_at = now()
          where id = $1
          returning id, owner_user_id, workspace_id, title, status, playback_urls, dvr_enabled, latency_profile,
                    failure_reason, created_at, updated_at, starting_at, live_at, stopping_at, ended_at, failed_at
        `,
        [input.sessionId, JSON.stringify(provisioned.playbackUrls)],
      )

      const populated = liveRows[0] ?? session
      session = await transitionSessionStatus(populated, "live", {
        actorUserId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
        reason: "Provider endpoint provisioned",
      })
      const endpoint = await getLatestEndpoint(input.sessionId)
      const response = { session: toSession(session, endpoint) }
      await persistIdempotentResponse(input.sessionId, "start", input.idempotencyKey, response)
      return response
    } catch (error) {
      await transitionSessionStatus(session, "failed", {
        actorUserId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
        reason: error instanceof Error ? error.message : "Failed to start live stream session",
      })
      throw new LiveStreamValidationError("Failed to start live stream session", 500)
    }
  }

  async stopSession(input: {
    sessionId: string
    actorUserId: number
    idempotencyKey: string
  }): Promise<LiveStreamSessionResponse> {
    const existing = await lookupIdempotentResponse(input.sessionId, "stop", input.idempotencyKey)
    if (existing) return existing

    let session = await assertOwnership(input.sessionId, input.actorUserId)
    if (session.status === "ended" || session.status === "stopping") {
      const endpoint = await getLatestEndpoint(input.sessionId)
      const response = { session: toSession(session, endpoint) }
      await persistIdempotentResponse(input.sessionId, "stop", input.idempotencyKey, response)
      return response
    }

    session = await transitionSessionStatus(session, "stopping", {
      actorUserId: input.actorUserId,
      idempotencyKey: input.idempotencyKey,
      reason: "Stop requested",
    })

    try {
      const provider = getLiveStreamProvider()
      await provider.stop({ sessionId: input.sessionId })
      session = await transitionSessionStatus(session, "ended", {
        actorUserId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
        reason: "Session stopped",
      })
      const endpoint = await getLatestEndpoint(input.sessionId)
      const response = { session: toSession(session, endpoint) }
      await persistIdempotentResponse(input.sessionId, "stop", input.idempotencyKey, response)
      return response
    } catch (error) {
      await transitionSessionStatus(session, "failed", {
        actorUserId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
        reason: error instanceof Error ? error.message : "Failed to stop live stream session",
      })
      throw new LiveStreamValidationError("Failed to stop live stream session", 500)
    }
  }

  async getEvents(input: { sessionId: string; actorUserId: number }): Promise<LiveStreamEventsResponse> {
    await assertOwnership(input.sessionId, input.actorUserId)

    const rows = await queryMany<DbEventRow>(
      `
        select id, session_id, event_type, from_status, to_status, actor_user_id, idempotency_key, reason, payload, occurred_at
        from live_stream_events
        where session_id = $1
        order by occurred_at asc
      `,
      [input.sessionId],
    )

    return { events: rows.map(toEvent) }
  }
}

export const liveStreamService = new LiveStreamService()
