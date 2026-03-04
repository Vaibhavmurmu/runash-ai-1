import { one, queryMany, sql } from "@/lib/db"
import {
  createDefaultLiveControlState,
  resolveVisibilityDefault,
  type LiveControlAction,
  type LiveControlPoll,
  type LiveControlState,
  type StreamVisibility,
  validateTrailerAssetId,
} from "@/lib/types/stream-live-control"

type StreamControlRow = {
  stream_id: string
  user_id: string
  settings: Record<string, unknown> | string | null
  updated_at: string
}

type StreamControlPollRow = {
  id: string
  stream_id: string
  question: string
  status: "draft" | "live" | "ended"
  options: Array<{ id: string; label: string; votes: number }> | string
  started_at: string | null
  ended_at: string | null
}

function parseSettings(settings: StreamControlRow["settings"]): Record<string, any> {
  if (!settings) return {}
  if (typeof settings === "string") {
    try {
      return JSON.parse(settings)
    } catch {
      return {}
    }
  }
  return settings
}

function hydrate(streamId: string, settings: Record<string, any>, updatedAt?: string): LiveControlState {
  const base = createDefaultLiveControlState(streamId)
  const minimumViewerAge =
    typeof settings.visibility?.minimumViewerAge === "number" ? settings.visibility.minimumViewerAge : undefined
  const creatorAge = typeof settings.visibility?.creatorAge === "number" ? settings.visibility.creatorAge : undefined
  const explicitVisibility = settings.visibility?.explicitVisibility as StreamVisibility | undefined
  const defaultVisibility = resolveVisibilityDefault(creatorAge)
  const dataSaverPreset =
    settings.network?.dataSaverPreset === "off" ||
    settings.network?.dataSaverPreset === "balanced" ||
    settings.network?.dataSaverPreset === "aggressive"
      ? settings.network.dataSaverPreset
      : "balanced"
  const manualFallbackOverride =
    settings.network?.manualFallbackOverride === "auto" ||
    settings.network?.manualFallbackOverride === "force_standard" ||
    settings.network?.manualFallbackOverride === "force_fallback"
      ? settings.network.manualFallbackOverride
      : "auto"

  return {
    ...base,
    visibility: {
      explicitVisibility,
      minimumViewerAge,
      creatorAge,
      defaultVisibility,
      resolvedVisibility: explicitVisibility ?? defaultVisibility,
    },
    scheduledMetadata: {
      trailerAssetId: settings.scheduledMetadata?.trailerAssetId ?? null,
      trailerTitle: settings.scheduledMetadata?.trailerTitle ?? "",
      scheduledAt: settings.scheduledMetadata?.scheduledAt ?? null,
    },
    dualStream: {
      mode: settings.dualStream?.mode === "dual" ? "dual" : "single",
      primaryOrientation: settings.dualStream?.primaryOrientation === "vertical" ? "vertical" : "horizontal",
      linkedStreamId: settings.dualStream?.linkedStreamId ?? null,
      sharedChatEnabled: Boolean(settings.dualStream?.sharedChatEnabled),
    },
    membersOnly: {
      enabled: Boolean(settings.membersOnly?.enabled),
      transitionedAt: settings.membersOnly?.transitionedAt ?? null,
      reason: settings.membersOnly?.reason ?? "",
    },
    network: {
      lowLatencyMode: Boolean(settings.network?.lowLatencyMode),
      autoQualityFallbackOnWeakNetwork:
        typeof settings.network?.autoQualityFallbackOnWeakNetwork === "boolean"
          ? settings.network.autoQualityFallbackOnWeakNetwork
          : true,
      dataSaverPreset,
      manualFallbackOverride,
    },
    moderation: {
      pinnedMessageId: settings.moderation?.pinnedMessageId ?? null,
      qna: {
        status: settings.moderation?.qna?.status === "live" ? "live" : "idle",
        selectedQuestionId: settings.moderation?.qna?.selectedQuestionId ?? null,
        startedAt: settings.moderation?.qna?.startedAt ?? null,
        endedAt: settings.moderation?.qna?.endedAt ?? null,
      },
      polls: [],
    },
    updatedAt: updatedAt ?? new Date().toISOString(),
  }
}

async function readPolls(streamId: string): Promise<LiveControlPoll[]> {
  const rows = await queryMany<StreamControlPollRow>(
    `select id, stream_id, question, status, options, started_at, ended_at from stream_live_control_polls where stream_id = $1 order by created_at desc`,
    [streamId],
  )

  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    status: row.status,
    options: typeof row.options === "string" ? JSON.parse(row.options) : row.options,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  }))
}

export async function getLiveControlState(userId: string, streamId: string): Promise<LiveControlState> {
  const row = await one<StreamControlRow>(sql`
    select id as stream_id, user_id, settings, updated_at from streams where id=${streamId} and user_id=${userId}
  `)

  if (!row) {
    throw new Error("Stream not found")
  }

  const settings = parseSettings(row.settings)
  const state = hydrate(streamId, settings.liveControl ?? {}, row.updated_at)
  state.moderation.polls = await readPolls(streamId)
  return state
}

export async function upsertLiveControlState(
  userId: string,
  streamId: string,
  input: Partial<LiveControlState>,
): Promise<LiveControlState> {
  const current = await getLiveControlState(userId, streamId)
  const minimumViewerAge = input.visibility?.minimumViewerAge ?? current.visibility.minimumViewerAge
  const creatorAge = input.visibility?.creatorAge ?? current.visibility.creatorAge
  const explicitVisibility = input.visibility?.explicitVisibility ?? current.visibility.explicitVisibility
  const defaultVisibility = resolveVisibilityDefault(creatorAge)
  const resolvedVisibility = explicitVisibility ?? defaultVisibility
  const trailerAssetId = validateTrailerAssetId(input.scheduledMetadata?.trailerAssetId ?? current.scheduledMetadata.trailerAssetId)

  const next: LiveControlState = {
    ...current,
    visibility: {
      explicitVisibility,
      minimumViewerAge,
      creatorAge,
      defaultVisibility,
      resolvedVisibility,
    },
    scheduledMetadata: {
      trailerAssetId,
      trailerTitle: input.scheduledMetadata?.trailerTitle ?? current.scheduledMetadata.trailerTitle,
      scheduledAt: input.scheduledMetadata?.scheduledAt ?? current.scheduledMetadata.scheduledAt,
    },
    dualStream: {
      mode: input.dualStream?.mode ?? current.dualStream.mode,
      primaryOrientation: input.dualStream?.primaryOrientation ?? current.dualStream.primaryOrientation,
      linkedStreamId: input.dualStream?.linkedStreamId ?? current.dualStream.linkedStreamId,
      sharedChatEnabled: input.dualStream?.sharedChatEnabled ?? current.dualStream.sharedChatEnabled,
    },
    membersOnly: {
      enabled: input.membersOnly?.enabled ?? current.membersOnly.enabled,
      transitionedAt: input.membersOnly?.transitionedAt ?? current.membersOnly.transitionedAt,
      reason: input.membersOnly?.reason ?? current.membersOnly.reason,
    },
    network: {
      lowLatencyMode: input.network?.lowLatencyMode ?? current.network.lowLatencyMode,
      autoQualityFallbackOnWeakNetwork:
        input.network?.autoQualityFallbackOnWeakNetwork ?? current.network.autoQualityFallbackOnWeakNetwork,
      dataSaverPreset: input.network?.dataSaverPreset ?? current.network.dataSaverPreset,
      manualFallbackOverride: input.network?.manualFallbackOverride ?? current.network.manualFallbackOverride,
    },
    moderation: {
      ...current.moderation,
    },
    updatedAt: new Date().toISOString(),
  }

  await sql`
    update streams
    set settings = jsonb_set(coalesce(settings::jsonb, '{}'::jsonb), '{liveControl}', ${JSON.stringify(next)}::jsonb),
        updated_at = now()
    where id=${streamId} and user_id=${userId}
  `

  return next
}

export async function applyLiveControlAction(userId: string, streamId: string, action: LiveControlAction): Promise<LiveControlState> {
  const current = await getLiveControlState(userId, streamId)
  const now = new Date().toISOString()

  if (action.type === "pin_message") {
    current.moderation.pinnedMessageId = action.messageId
  } else if (action.type === "unpin_message") {
    current.moderation.pinnedMessageId = null
  } else if (action.type === "qna_start") {
    current.moderation.qna = { ...current.moderation.qna, status: "live", startedAt: now, endedAt: null }
  } else if (action.type === "qna_select") {
    current.moderation.qna = { ...current.moderation.qna, selectedQuestionId: action.questionId }
  } else if (action.type === "qna_end") {
    current.moderation.qna = { ...current.moderation.qna, status: "idle", endedAt: now }
  } else if (action.type === "poll_create") {
    const pollId = crypto.randomUUID()
    await sql`
      insert into stream_live_control_polls (id, stream_id, question, status, options)
      values (
        ${pollId},
        ${streamId},
        ${action.question},
        'draft',
        ${JSON.stringify(action.options.map((option, index) => ({ id: `opt_${index + 1}`, label: option, votes: 0 })))}
      )
    `
  } else if (action.type === "poll_start") {
    await sql`
      update stream_live_control_polls
      set status='live', started_at=now(), ended_at=null, updated_at=now()
      where id=${action.pollId} and stream_id=${streamId}
    `
  } else if (action.type === "poll_end") {
    await sql`
      update stream_live_control_polls
      set status='ended', ended_at=now(), updated_at=now()
      where id=${action.pollId} and stream_id=${streamId}
    `
  } else if (action.type === "members_only_transition") {
    current.membersOnly = {
      enabled: action.enabled,
      transitionedAt: now,
      reason: action.reason ?? "",
    }
  }

  const next = await upsertLiveControlState(userId, streamId, current)

  await sql`
    insert into stream_live_control_audit_logs (stream_id, actor_user_id, action_type, payload)
    values (${streamId}, ${userId}, ${action.type}, ${JSON.stringify(action)})
  `

  return {
    ...next,
    moderation: {
      ...next.moderation,
      polls: await readPolls(streamId),
    },
  }
}
