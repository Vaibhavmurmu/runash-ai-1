export type StreamVisibility = "public" | "unlisted" | "private"

export interface StreamVisibilityPolicy {
  explicitVisibility?: StreamVisibility
  minimumViewerAge?: number
  creatorAge?: number
  defaultVisibility: StreamVisibility
  resolvedVisibility: StreamVisibility
}

export interface ScheduledStreamMetadata {
  trailerAssetId: string | null
  trailerTitle?: string
  scheduledAt: string | null
}

export interface DualStreamConfiguration {
  mode: "single" | "dual"
  primaryOrientation: "horizontal" | "vertical"
  linkedStreamId: string | null
  sharedChatEnabled: boolean
}

export interface MembersOnlyMode {
  enabled: boolean
  transitionedAt: string | null
  reason?: string
}

export interface LiveControlPollOption {
  id: string
  label: string
  votes: number
}

export interface LiveControlPoll {
  id: string
  question: string
  status: "draft" | "live" | "ended"
  options: LiveControlPollOption[]
  startedAt: string | null
  endedAt: string | null
}

export interface LiveControlState {
  streamId: string
  visibility: StreamVisibilityPolicy
  scheduledMetadata: ScheduledStreamMetadata
  dualStream: DualStreamConfiguration
  membersOnly: MembersOnlyMode
  moderation: {
    pinnedMessageId: string | null
    qna: {
      status: "idle" | "live"
      selectedQuestionId: string | null
      startedAt: string | null
      endedAt: string | null
    }
    polls: LiveControlPoll[]
  }
  updatedAt: string
}

export type LiveControlAction =
  | { type: "pin_message"; messageId: string }
  | { type: "unpin_message" }
  | { type: "qna_start" }
  | { type: "qna_select"; questionId: string }
  | { type: "qna_end" }
  | { type: "poll_create"; question: string; options: string[] }
  | { type: "poll_start"; pollId: string }
  | { type: "poll_end"; pollId: string }
  | { type: "members_only_transition"; enabled: boolean; reason?: string }

export function resolveVisibilityDefault(creatorAge: number | undefined): StreamVisibility {
  if (typeof creatorAge !== "number") return "public"
  if (creatorAge >= 13 && creatorAge <= 17) return "private"
  if (creatorAge >= 18) return "public"
  return "private"
}

export function validateTrailerAssetId(trailerAssetId: string | null | undefined): string | null {
  if (!trailerAssetId) return null
  const normalized = trailerAssetId.trim()
  if (!/^asset_[a-zA-Z0-9_-]{8,64}$/.test(normalized)) {
    throw new Error("trailerAssetId must follow pattern asset_<id>")
  }

  return normalized
}

export function createDefaultLiveControlState(streamId: string): LiveControlState {
  const defaultVisibility = resolveVisibilityDefault(undefined)
  return {
    streamId,
    visibility: {
      explicitVisibility: undefined,
      minimumViewerAge: undefined,
      defaultVisibility,
      resolvedVisibility: defaultVisibility,
    },
    scheduledMetadata: {
      trailerAssetId: null,
      trailerTitle: "",
      scheduledAt: null,
    },
    dualStream: {
      mode: "single",
      primaryOrientation: "horizontal",
      linkedStreamId: null,
      sharedChatEnabled: false,
    },
    membersOnly: {
      enabled: false,
      transitionedAt: null,
      reason: "",
    },
    moderation: {
      pinnedMessageId: null,
      qna: {
        status: "idle",
        selectedQuestionId: null,
        startedAt: null,
        endedAt: null,
      },
      polls: [],
    },
    updatedAt: new Date().toISOString(),
  }
}
