import { one, sql } from "@/lib/db"

export type StudioStreamMetadata = {
  updatedAt?: string
  streamQuality?: number
  selectedLayout?: string
  isMuted?: boolean
  isCameraOn?: boolean
  selectedDeviceIds?: { mic?: string; camera?: string }
  consentPreferences?: {
    allowMic?: boolean
    allowCamera?: boolean
    allowScreenShare?: boolean
    allowRecording?: boolean
    preferredLanguage?: "en" | "hi"
  }
  aiSettings?: Record<string, unknown>
}

export type StreamBackgroundAsset = {
  id: string
  name: string
  url: string
  thumbnailUrl: string
  category: string[]
  tags: string[]
  isPremium: boolean
  isNew?: boolean
  isFeatured?: boolean
  createdAt: string
  downloadCount?: number
  isSaved?: boolean
  isPublic?: boolean
}


export type StreamBackgroundCollection = {
  id: string
  name: string
  description: string
  backgrounds: string[]
  coverImage: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export type StreamBackgroundCategory = {
  id: string
  name: string
  description: string
  icon: string
  count: number
  featured?: boolean
  createdAt: string
  updatedAt: string
}

export type StreamChatParticipant = {
  id: string
  username: string
  platform: "twitch" | "youtube" | "facebook" | "tiktok"
  isModerator: boolean
  isSubscriber: boolean
  isVIP: boolean
  timedOutUntil?: string | null
}

type StreamRow = {
  id: string
  settings: Record<string, unknown> | string | null
}

type StudioSettings = {
  metadata?: StudioStreamMetadata
  backgrounds?: StreamBackgroundAsset[]
  participants?: StreamChatParticipant[]
  collections?: StreamBackgroundCollection[]
  categories?: StreamBackgroundCategory[]
}

function parseSettings(raw: StreamRow["settings"]): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return raw
}

async function getStream(streamId: string) {
  const row = await one<StreamRow>(sql`
    select id, settings from streams where id=${streamId}
  `)
  if (!row) {
    throw new Error("Stream not found")
  }

  const settings = parseSettings(row.settings)
  const studio = (settings.studioData as StudioSettings | undefined) ?? {}
  return { settings, studio }
}

async function saveStudioData(streamId: string, studioData: StudioSettings) {
  await sql`
    update streams
    set settings = jsonb_set(coalesce(settings::jsonb, '{}'::jsonb), '{studioData}', ${JSON.stringify(studioData)}::jsonb),
        updated_at = now()
    where id=${streamId}
  `
}

export async function getStreamMetadata(streamId: string): Promise<StudioStreamMetadata> {
  const { studio } = await getStream(streamId)
  return studio.metadata ?? {}
}

export async function saveStreamMetadata(streamId: string, patch: Partial<StudioStreamMetadata>): Promise<StudioStreamMetadata> {
  const { studio } = await getStream(streamId)
  const next = {
    ...(studio.metadata ?? {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  await saveStudioData(streamId, {
    ...studio,
    metadata: next,
  })
  return next
}

export async function listStreamBackgrounds(streamId: string): Promise<StreamBackgroundAsset[]> {
  const { studio } = await getStream(streamId)
  return studio.backgrounds ?? []
}

export async function createStreamBackground(
  streamId: string,
  input: Omit<StreamBackgroundAsset, "createdAt" | "downloadCount"> & Partial<Pick<StreamBackgroundAsset, "createdAt" | "downloadCount">>,
): Promise<StreamBackgroundAsset> {
  const { studio } = await getStream(streamId)
  const created: StreamBackgroundAsset = {
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
    downloadCount: input.downloadCount ?? 0,
  }

  await saveStudioData(streamId, {
    ...studio,
    backgrounds: [created, ...(studio.backgrounds ?? []).filter((asset) => asset.id !== created.id)],
  })

  return created
}

export async function updateStreamBackground(
  streamId: string,
  backgroundId: string,
  patch: Partial<StreamBackgroundAsset>,
): Promise<StreamBackgroundAsset> {
  const { studio } = await getStream(streamId)
  const backgrounds = studio.backgrounds ?? []
  const existing = backgrounds.find((asset) => asset.id === backgroundId)
  if (!existing) {
    throw new Error("Background not found")
  }
  const next = { ...existing, ...patch }
  await saveStudioData(streamId, {
    ...studio,
    backgrounds: backgrounds.map((asset) => (asset.id === backgroundId ? next : asset)),
  })
  return next
}

export async function deleteStreamBackground(streamId: string, backgroundId: string): Promise<void> {
  const { studio } = await getStream(streamId)
  await saveStudioData(streamId, {
    ...studio,
    backgrounds: (studio.backgrounds ?? []).filter((asset) => asset.id !== backgroundId),
  })
}

export async function listStreamParticipants(streamId: string, platform?: StreamChatParticipant["platform"]) {
  const { studio } = await getStream(streamId)
  const participants = studio.participants ?? []
  if (!platform) return participants
  return participants.filter((participant) => participant.platform === platform)
}

export async function moderateStreamParticipant(
  streamId: string,
  participantId: string,
  action: "make_moderator" | "make_vip" | "timeout" | "clear_timeout",
): Promise<StreamChatParticipant> {
  const { studio } = await getStream(streamId)
  const participants = studio.participants ?? []
  const participant = participants.find((entry) => entry.id === participantId)
  if (!participant) {
    throw new Error("Participant not found")
  }

  const updated: StreamChatParticipant = {
    ...participant,
    isModerator: action === "make_moderator" ? true : participant.isModerator,
    isVIP: action === "make_vip" ? true : participant.isVIP,
    timedOutUntil:
      action === "timeout"
        ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
        : action === "clear_timeout"
          ? null
          : participant.timedOutUntil,
  }

  await saveStudioData(streamId, {
    ...studio,
    participants: participants.map((entry) => (entry.id === participantId ? updated : entry)),
  })

  return updated
}


export async function listStreamBackgroundCollections(streamId: string): Promise<StreamBackgroundCollection[]> {
  const { studio } = await getStream(streamId)
  return studio.collections ?? []
}

export async function createStreamBackgroundCollection(
  streamId: string,
  input: Omit<StreamBackgroundCollection, "createdAt" | "updatedAt"> & Partial<Pick<StreamBackgroundCollection, "createdAt" | "updatedAt">>,
): Promise<StreamBackgroundCollection> {
  const { studio } = await getStream(streamId)
  const now = new Date().toISOString()
  const created: StreamBackgroundCollection = {
    ...input,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  }

  await saveStudioData(streamId, {
    ...studio,
    collections: [created, ...(studio.collections ?? []).filter((entry) => entry.id !== created.id)],
  })

  return created
}

export async function updateStreamBackgroundCollection(
  streamId: string,
  collectionId: string,
  patch: Partial<StreamBackgroundCollection>,
): Promise<StreamBackgroundCollection> {
  const { studio } = await getStream(streamId)
  const collections = studio.collections ?? []
  const existing = collections.find((entry) => entry.id === collectionId)
  if (!existing) {
    throw new Error("Collection not found")
  }

  const next: StreamBackgroundCollection = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  }

  await saveStudioData(streamId, {
    ...studio,
    collections: collections.map((entry) => (entry.id === collectionId ? next : entry)),
  })

  return next
}

export async function deleteStreamBackgroundCollection(streamId: string, collectionId: string): Promise<void> {
  const { studio } = await getStream(streamId)
  await saveStudioData(streamId, {
    ...studio,
    collections: (studio.collections ?? []).filter((entry) => entry.id !== collectionId),
  })
}

export async function listStreamBackgroundCategories(streamId: string): Promise<StreamBackgroundCategory[]> {
  const { studio } = await getStream(streamId)
  return studio.categories ?? []
}

export async function createStreamBackgroundCategory(
  streamId: string,
  input: Omit<StreamBackgroundCategory, "createdAt" | "updatedAt" | "count"> &
    Partial<Pick<StreamBackgroundCategory, "createdAt" | "updatedAt" | "count">>,
): Promise<StreamBackgroundCategory> {
  const { studio } = await getStream(streamId)
  const now = new Date().toISOString()
  const created: StreamBackgroundCategory = {
    ...input,
    count: input.count ?? 0,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  }

  await saveStudioData(streamId, {
    ...studio,
    categories: [created, ...(studio.categories ?? []).filter((entry) => entry.id !== created.id)],
  })

  return created
}

export async function updateStreamBackgroundCategory(
  streamId: string,
  categoryId: string,
  patch: Partial<StreamBackgroundCategory>,
): Promise<StreamBackgroundCategory> {
  const { studio } = await getStream(streamId)
  const categories = studio.categories ?? []
  const existing = categories.find((entry) => entry.id === categoryId)
  if (!existing) {
    throw new Error("Category not found")
  }

  const next: StreamBackgroundCategory = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  }

  await saveStudioData(streamId, {
    ...studio,
    categories: categories.map((entry) => (entry.id === categoryId ? next : entry)),
  })

  return next
}

export async function deleteStreamBackgroundCategory(streamId: string, categoryId: string): Promise<void> {
  const { studio } = await getStream(streamId)
  await saveStudioData(streamId, {
    ...studio,
    categories: (studio.categories ?? []).filter((entry) => entry.id !== categoryId),
  })
}
