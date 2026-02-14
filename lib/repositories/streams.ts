import { promises as fs } from "fs"
import path from "path"
import { one, queryMany, sql } from "@/lib/db"
import type { UUID } from "@/lib/types"
import type {
  DashboardRecentStream,
  DashboardScheduledStream,
  DashboardStreamsStore,
} from "@/lib/types/dashboard-streams"

export type Stream = {
  id: string
  user_id: string
  title: string
  description: string | null
  category: string | null
  status: "scheduled" | "live" | "ended"
  stream_key: string | null
  rtmp_url: string | null
  thumbnail_url: string | null
  scheduled_start: string | null
  actual_start: string | null
  actual_end: string | null
  max_viewers: number
  total_revenue: number
  ai_agent_id: string | null
  settings: Record<string, any>
  created_at?: string
  updated_at?: string
}

type StreamInvite = {
  id: string
  user_id: string
  stream_id: string
  email: string
  sent_at: string
}

const DATA_FILE = path.join(process.cwd(), "data", "streams.json")
const DEV_FALLBACK_ENABLED =
  process.env.NODE_ENV !== "production" && process.env.RUNASH_STREAMS_DEV_FALLBACK === "1"
const DEV_BOOTSTRAP_ENABLED =
  process.env.NODE_ENV !== "production" && process.env.RUNASH_STREAMS_DEV_BOOTSTRAP !== "0"

const bootstrappedUsers = new Set<string>()

function parseSettings(settings: unknown): Record<string, any> {
  if (settings && typeof settings === "object") return settings as Record<string, any>
  if (typeof settings === "string") {
    try {
      const parsed = JSON.parse(settings)
      if (parsed && typeof parsed === "object") return parsed
    } catch {
      return {}
    }
  }
  return {}
}

function toRecentStream(stream: Stream): DashboardRecentStream {
  const metadata = parseSettings(stream.settings)

  return {
    id: stream.id,
    title: stream.title,
    category: stream.category ?? undefined,
    date: stream.actual_start ?? stream.created_at ?? new Date().toISOString(),
    viewers: Number(metadata.viewers ?? stream.max_viewers ?? 0),
    duration: metadata.duration ?? null,
    url: String(metadata.url ?? ""),
    status: (stream.status === "scheduled" ? "scheduled" : stream.status) as DashboardRecentStream["status"],
  }
}

function toScheduledStream(stream: Stream): DashboardScheduledStream {
  const metadata = parseSettings(stream.settings)

  return {
    id: stream.id,
    title: stream.title,
    description: stream.description ?? metadata.description ?? "",
    category: stream.category ?? undefined,
    startsAt: stream.scheduled_start ?? metadata.startsAt ?? stream.created_at ?? new Date().toISOString(),
    url: metadata.url,
    status: "scheduled",
    duration: Number(metadata.duration ?? 60),
    platforms: Array.isArray(metadata.platforms) ? metadata.platforms : [],
    isRecurring: Boolean(metadata.isRecurring),
    recurrencePattern: metadata.recurrencePattern,
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
    isPublic: metadata.isPublic ?? true,
    notificationTime: Number(metadata.notificationTime ?? 15),
    templateId: metadata.templateId,
    createdAt: stream.created_at ?? new Date().toISOString(),
    updatedAt: stream.updated_at ?? stream.created_at ?? new Date().toISOString(),
  }
}

async function ensureInviteTable() {
  await sql`
    create table if not exists stream_invites (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      stream_id uuid not null references streams(id) on delete cascade,
      email text not null,
      sent_at timestamptz not null default now(),
      created_at timestamptz not null default now()
    )
  `
  await sql`create index if not exists idx_stream_invites_user_id on stream_invites(user_id)`
  await sql`create index if not exists idx_stream_invites_stream_id on stream_invites(stream_id)`
}

async function readLegacyStore(): Promise<DashboardStreamsStore | null> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8")
    const parsed = JSON.parse(raw) as Partial<DashboardStreamsStore>

    return {
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
      scheduled: Array.isArray(parsed.scheduled) ? parsed.scheduled : [],
      invites: Array.isArray(parsed.invites) ? parsed.invites : [],
      templates: Array.isArray(parsed.templates) ? parsed.templates : [],
    }
  } catch {
    return null
  }
}

async function bootstrapLegacyDevData(userId: string) {
  if (!DEV_BOOTSTRAP_ENABLED || bootstrappedUsers.has(userId)) return

  const existing = await queryMany<{ id: string }>(
    `select id from streams where user_id=$1 limit 1`,
    [userId],
  )

  if (existing.length > 0) {
    bootstrappedUsers.add(userId)
    return
  }

  const legacy = await readLegacyStore()
  if (!legacy) {
    bootstrappedUsers.add(userId)
    return
  }

  for (const item of legacy.recent) {
    await sql`
      insert into streams (
        user_id, title, description, category, status, actual_start, max_viewers, settings
      )
      values (
        ${userId},
        ${item.title},
        ${null},
        ${item.category ?? null},
        ${item.status === "live" ? "live" : "ended"},
        ${item.date},
        ${item.viewers ?? 0},
        ${JSON.stringify({ url: item.url, duration: item.duration, viewers: item.viewers ?? 0 })}
      )
      on conflict do nothing
    `
  }

  for (const item of legacy.scheduled) {
    await sql`
      insert into streams (
        user_id, title, description, category, status, scheduled_start, settings
      )
      values (
        ${userId},
        ${item.title},
        ${item.description ?? null},
        ${item.category ?? null},
        'scheduled',
        ${item.startsAt},
        ${JSON.stringify({
          url: item.url,
          duration: item.duration ?? 60,
          platforms: item.platforms ?? [],
          isRecurring: item.isRecurring ?? false,
          recurrencePattern: item.recurrencePattern,
          tags: item.tags ?? [],
          isPublic: item.isPublic ?? true,
          notificationTime: item.notificationTime ?? 15,
          templateId: item.templateId,
        })}
      )
      on conflict do nothing
    `
  }

  if (legacy.invites.length > 0) {
    await ensureInviteTable()
    const latestStream = await one<{ id: string }>(sql<{ id: string }[]>`
      select id from streams where user_id=${userId} order by created_at desc limit 1
    `)

    if (latestStream) {
      for (const invite of legacy.invites) {
        await sql`
          insert into stream_invites (user_id, stream_id, email, sent_at)
          values (${userId}, ${latestStream.id}, ${invite.email}, ${invite.sentAt})
        `
      }
    }
  }

  bootstrappedUsers.add(userId)
}

async function readLegacyDevFallback(): Promise<DashboardStreamsStore> {
  const legacy = await readLegacyStore()
  return (
    legacy ?? {
      recent: [],
      scheduled: [],
      invites: [],
      templates: [],
    }
  )
}

export async function listStreams(userId?: UUID): Promise<Stream[]> {
  if (userId) {
    return queryMany<Stream>(`select * from streams where user_id=$1 order by created_at desc`, [userId])
  }
  return queryMany<Stream>(`select * from streams order by created_at desc`)
}

export async function getStream(id: UUID): Promise<Stream | null> {
  return one<Stream>(sql<Stream[]>`select * from streams where id=${id} limit 1`)
}

export async function createStream(userId: UUID, input: Partial<Stream>): Promise<Stream> {
  const rows = await sql<Stream[]>`
    insert into streams (
      user_id, title, description, category, status, stream_key, rtmp_url, thumbnail_url,
      scheduled_start, actual_start, actual_end, max_viewers, total_revenue, ai_agent_id, settings
    )
    values (
      ${userId},
      ${input.title ?? "Untitled Stream"},
      ${input.description ?? null},
      ${input.category ?? "General"},
      ${input.status ?? "scheduled"},
      ${input.stream_key ?? null},
      ${input.rtmp_url ?? null},
      ${input.thumbnail_url ?? null},
      ${input.scheduled_start ?? null},
      ${input.actual_start ?? null},
      ${input.actual_end ?? null},
      ${input.max_viewers ?? 0},
      ${input.total_revenue ?? 0},
      ${input.ai_agent_id ?? null},
      ${input.settings ? JSON.stringify(input.settings) : "{}"}
    )
    returning *
  `
  return rows[0]
}

export async function updateStream(id: UUID, input: Partial<Stream>): Promise<Stream | null> {
  const current = await getStream(id)
  if (!current) return null
  const rows = await sql<Stream[]>`
    update streams
    set
      title=${input.title ?? current.title},
      description=${input.description ?? current.description},
      category=${input.category ?? current.category},
      status=${(input.status as any) ?? current.status},
      stream_key=${input.stream_key ?? current.stream_key},
      rtmp_url=${input.rtmp_url ?? current.rtmp_url},
      thumbnail_url=${input.thumbnail_url ?? current.thumbnail_url},
      scheduled_start=${input.scheduled_start ?? current.scheduled_start},
      actual_start=${input.actual_start ?? current.actual_start},
      actual_end=${input.actual_end ?? current.actual_end},
      max_viewers=${input.max_viewers ?? current.max_viewers},
      total_revenue=${input.total_revenue ?? current.total_revenue},
      ai_agent_id=${input.ai_agent_id ?? current.ai_agent_id},
      settings=${input.settings ? JSON.stringify(input.settings) : JSON.stringify(current.settings)},
      updated_at=now()
    where id=${id}
    returning *
  `
  return rows[0] ?? null
}

export async function deleteStream(id: UUID): Promise<boolean> {
  const rows = await sql<{ id: UUID }[]>`delete from streams where id=${id} returning id`
  return rows.length > 0
}

export async function createDashboardLiveStream(userId: string, input: DashboardRecentStream) {
  await bootstrapLegacyDevData(userId)

  try {
    const rows = await sql<Stream[]>`
      insert into streams (
        user_id, title, category, status, actual_start, max_viewers, settings
      )
      values (
        ${userId}, ${input.title}, ${input.category ?? null}, 'live', ${input.date}, ${input.viewers},
        ${JSON.stringify({ url: input.url, duration: input.duration, viewers: input.viewers })}
      )
      returning *
    `

    return toRecentStream(rows[0])
  } catch (error) {
    if (!DEV_FALLBACK_ENABLED) throw error
    const fallback = await readLegacyDevFallback()
    fallback.recent = [input, ...fallback.recent].slice(0, 20)
    await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(fallback, null, 2), "utf-8")
    return input
  }
}

export async function createDashboardScheduledStream(userId: string, input: DashboardScheduledStream) {
  await bootstrapLegacyDevData(userId)

  try {
    const rows = await sql<Stream[]>`
      insert into streams (
        user_id, title, description, category, status, scheduled_start, settings
      )
      values (
        ${userId}, ${input.title}, ${input.description ?? null}, ${input.category ?? null}, 'scheduled', ${input.startsAt},
        ${JSON.stringify({
          url: input.url,
          duration: input.duration ?? 60,
          platforms: input.platforms ?? [],
          isRecurring: input.isRecurring ?? false,
          recurrencePattern: input.recurrencePattern,
          tags: input.tags ?? [],
          isPublic: input.isPublic ?? true,
          notificationTime: input.notificationTime ?? 15,
          templateId: input.templateId,
        })}
      )
      returning *
    `

    return toScheduledStream(rows[0])
  } catch (error) {
    if (!DEV_FALLBACK_ENABLED) throw error
    const fallback = await readLegacyDevFallback()
    fallback.scheduled = [input, ...fallback.scheduled]
    await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(fallback, null, 2), "utf-8")
    return input
  }
}

export async function listDashboardRecentStreams(userId: string, limit = 6): Promise<DashboardRecentStream[]> {
  await bootstrapLegacyDevData(userId)

  try {
    const rows = await queryMany<Stream>(
      `select * from streams where user_id=$1 and status in ('live', 'ended') order by coalesce(actual_start, created_at) desc limit $2`,
      [userId, limit],
    )
    return rows.map(toRecentStream)
  } catch (error) {
    if (!DEV_FALLBACK_ENABLED) throw error
    const fallback = await readLegacyDevFallback()
    return fallback.recent.slice(0, limit)
  }
}

export async function listDashboardScheduledStreams(userId: string): Promise<DashboardScheduledStream[]> {
  await bootstrapLegacyDevData(userId)

  try {
    const rows = await queryMany<Stream>(
      `select * from streams where user_id=$1 and status='scheduled' order by coalesce(scheduled_start, created_at) asc`,
      [userId],
    )
    return rows.map(toScheduledStream)
  } catch (error) {
    if (!DEV_FALLBACK_ENABLED) throw error
    const fallback = await readLegacyDevFallback()
    return fallback.scheduled
  }
}

export async function createDashboardStreamInvite(userId: string, streamId: string, email: string): Promise<StreamInvite> {
  await bootstrapLegacyDevData(userId)

  try {
    await ensureInviteTable()
    const rows = await sql<StreamInvite[]>`
      insert into stream_invites (user_id, stream_id, email)
      values (${userId}, ${streamId}, ${email})
      returning id, user_id, stream_id, email, sent_at
    `
    return rows[0]
  } catch (error) {
    if (!DEV_FALLBACK_ENABLED) throw error
    const fallback = await readLegacyDevFallback()
    const invite: StreamInvite = {
      id: crypto.randomUUID(),
      user_id: userId,
      stream_id: streamId,
      email,
      sent_at: new Date().toISOString(),
    }
    fallback.invites = [
      { id: invite.id, streamId: streamId, email, sentAt: invite.sent_at },
      ...fallback.invites,
    ]
    await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(fallback, null, 2), "utf-8")
    return invite
  }
}
