import { one, queryMany, sql } from "@/lib/db"
import type {
  ChatMessage,
  MobileChatListResponse,
  MobileCreateScheduleRequest,
  MobileCreateScheduleResponse,
  MobileCreateScheduleResult,
  MobileScheduleListResponse,
  MobileScheduleSyncMetadata,
  MobileSendChatMessageRequest,
  MobileSendChatMessageResponse,
  MobileUpdateScheduleRequest,
  ScheduledStream,
} from "@/types/mobile-app"

type MobileChatRow = {
  id: string
  platform: string
  username: string
  message: string
  created_at: string
  is_highlighted: boolean | null
  is_moderator: boolean | null
  is_subscriber: boolean | null
}

type MobileScheduleRow = {
  id: string
  title: string
  description: string | null
  scheduled_date: string
  duration: number
  platforms: string[] | string
  is_recurring: boolean
  recurrence_pattern: ScheduledStream["recurrencePattern"] | null | string
  tags: string[] | string
  category: string
  is_public: boolean
  notification_time: number
  template_id: string | null
  created_at: string
  updated_at: string
  version: number
}

let initialized: Promise<void> | null = null

async function ensureTables() {
  await sql`
    create table if not exists mobile_chat_messages (
      id uuid primary key default gen_random_uuid(),
      platform text not null,
      username text not null,
      message text not null,
      is_highlighted boolean not null default false,
      is_moderator boolean not null default false,
      is_subscriber boolean not null default false,
      created_at timestamptz not null default now()
    )
  `

  await sql`
    create table if not exists mobile_scheduled_streams (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      description text,
      scheduled_date timestamptz not null,
      duration integer not null,
      platforms jsonb not null default '[]'::jsonb,
      is_recurring boolean not null default false,
      recurrence_pattern jsonb,
      tags jsonb not null default '[]'::jsonb,
      category text not null default 'General',
      is_public boolean not null default true,
      notification_time integer not null default 15,
      template_id text,
      version integer not null default 1,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `
}

async function init() {
  if (!initialized) {
    initialized = ensureTables()
  }
  await initialized
}

function parseJsonArray(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return []
}

function parseRecurrence(
  value: MobileScheduleRow["recurrence_pattern"],
): ScheduledStream["recurrencePattern"] | undefined {
  if (!value) return undefined
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return parsed ?? undefined
    } catch {
      return undefined
    }
  }
  return value ?? undefined
}

function toChatMessage(row: MobileChatRow): ChatMessage {
  return {
    id: row.id,
    platform: row.platform,
    username: row.username,
    message: row.message,
    timestamp: row.created_at,
    isHighlighted: Boolean(row.is_highlighted),
    isModerator: Boolean(row.is_moderator),
    isSubscriber: Boolean(row.is_subscriber),
  }
}

function toScheduledStream(row: MobileScheduleRow): ScheduledStream {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    scheduledDate: row.scheduled_date,
    duration: Number(row.duration),
    platforms: parseJsonArray(row.platforms),
    isRecurring: row.is_recurring,
    recurrencePattern: parseRecurrence(row.recurrence_pattern),
    tags: parseJsonArray(row.tags),
    category: row.category,
    isPublic: row.is_public,
    notificationTime: Number(row.notification_time),
    templateId: row.template_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: Number(row.version),
  }
}

export async function listMobileChatMessages(limit = 200, since?: string): Promise<MobileChatListResponse> {
  await init()
  const rows = since
    ? await queryMany<MobileChatRow>(
        `select id, platform, username, message, created_at, is_highlighted, is_moderator, is_subscriber
         from mobile_chat_messages where created_at > $1 order by created_at asc limit $2`,
        [since, limit],
      )
    : await queryMany<MobileChatRow>(
        `select id, platform, username, message, created_at, is_highlighted, is_moderator, is_subscriber
         from mobile_chat_messages order by created_at asc limit $1`,
        [limit],
      )

  return {
    messages: rows.map(toChatMessage),
    cursor: rows.length > 0 ? rows[rows.length - 1].created_at : since ?? new Date().toISOString(),
  }
}

export async function createMobileChatMessage(payload: MobileSendChatMessageRequest): Promise<MobileSendChatMessageResponse> {
  await init()
  const [row] = await sql<MobileChatRow[]>`
    insert into mobile_chat_messages (platform, username, message, is_moderator, is_subscriber)
    values (${payload.platform}, ${payload.username}, ${payload.message}, ${payload.isModerator ?? false}, ${payload.isSubscriber ?? false})
    returning id, platform, username, message, created_at, is_highlighted, is_moderator, is_subscriber
  `

  return { message: toChatMessage(row) }
}

function buildSyncMeta(lastSyncedAt: string): MobileScheduleSyncMetadata {
  return {
    lastSyncedAt,
    pendingChanges: 0,
  }
}

export async function listMobileSchedules(): Promise<MobileScheduleListResponse> {
  await init()
  const rows = await queryMany<MobileScheduleRow>(
    `select id, title, description, scheduled_date, duration, platforms, is_recurring, recurrence_pattern,
            tags, category, is_public, notification_time, template_id, created_at, updated_at, version
     from mobile_scheduled_streams
     order by scheduled_date asc`,
  )

  return {
    streams: rows.map(toScheduledStream),
    sync: buildSyncMeta(new Date().toISOString()),
  }
}

export async function createMobileSchedule(payload: MobileCreateScheduleRequest): Promise<MobileCreateScheduleResponse> {
  await init()
  const [row] = await sql<MobileScheduleRow[]>`
    insert into mobile_scheduled_streams (
      title, description, scheduled_date, duration, platforms, is_recurring, recurrence_pattern,
      tags, category, is_public, notification_time, template_id
    )
    values (
      ${payload.title},
      ${payload.description ?? ""},
      ${payload.scheduledDate},
      ${payload.duration},
      ${JSON.stringify(payload.platforms ?? [])}::jsonb,
      ${payload.isRecurring ?? false},
      ${JSON.stringify(payload.recurrencePattern ?? null)}::jsonb,
      ${JSON.stringify(payload.tags ?? [])}::jsonb,
      ${payload.category ?? "General"},
      ${payload.isPublic ?? true},
      ${payload.notificationTime ?? 15},
      ${payload.templateId ?? null}
    )
    returning id, title, description, scheduled_date, duration, platforms, is_recurring, recurrence_pattern,
              tags, category, is_public, notification_time, template_id, created_at, updated_at, version
  `

  return { stream: toScheduledStream(row), sync: buildSyncMeta(new Date().toISOString()) }
}

export async function updateMobileSchedule(id: string, payload: MobileUpdateScheduleRequest): Promise<MobileCreateScheduleResult | null> {
  await init()
  const existing = await one<MobileScheduleRow>(sql<MobileScheduleRow[]>`
    select id, title, description, scheduled_date, duration, platforms, is_recurring, recurrence_pattern,
           tags, category, is_public, notification_time, template_id, created_at, updated_at, version
    from mobile_scheduled_streams
    where id = ${id}
    limit 1
  `)

  if (!existing) return null
  if (typeof payload.expectedVersion === "number" && payload.expectedVersion !== Number(existing.version)) {
    return { conflict: true, stream: toScheduledStream(existing), sync: buildSyncMeta(new Date().toISOString()) }
  }

  const [row] = await sql<MobileScheduleRow[]>`
    update mobile_scheduled_streams
    set
      title = ${payload.title ?? existing.title},
      description = ${payload.description ?? existing.description ?? ""},
      scheduled_date = ${payload.scheduledDate ?? existing.scheduled_date},
      duration = ${payload.duration ?? existing.duration},
      platforms = ${JSON.stringify(payload.platforms ?? parseJsonArray(existing.platforms))}::jsonb,
      is_recurring = ${payload.isRecurring ?? existing.is_recurring},
      recurrence_pattern = ${JSON.stringify(payload.recurrencePattern ?? parseRecurrence(existing.recurrence_pattern) ?? null)}::jsonb,
      tags = ${JSON.stringify(payload.tags ?? parseJsonArray(existing.tags))}::jsonb,
      category = ${payload.category ?? existing.category},
      is_public = ${payload.isPublic ?? existing.is_public},
      notification_time = ${payload.notificationTime ?? existing.notification_time},
      template_id = ${payload.templateId ?? existing.template_id},
      version = version + 1,
      updated_at = now()
    where id = ${id}
    returning id, title, description, scheduled_date, duration, platforms, is_recurring, recurrence_pattern,
              tags, category, is_public, notification_time, template_id, created_at, updated_at, version
  `

  return { stream: toScheduledStream(row), sync: buildSyncMeta(new Date().toISOString()) }
}

export async function deleteMobileSchedule(id: string, expectedVersion?: number): Promise<MobileCreateScheduleResult | null> {
  await init()
  if (typeof expectedVersion === "number") {
    const existing = await one<MobileScheduleRow>(sql<MobileScheduleRow[]>`
      select id, title, description, scheduled_date, duration, platforms, is_recurring, recurrence_pattern,
             tags, category, is_public, notification_time, template_id, created_at, updated_at, version
      from mobile_scheduled_streams where id=${id} limit 1
    `)
    if (!existing) return null
    if (expectedVersion !== Number(existing.version)) {
      return { conflict: true, stream: toScheduledStream(existing), sync: buildSyncMeta(new Date().toISOString()) }
    }
  }

  const deleted = await queryMany<{ id: string }>(`delete from mobile_scheduled_streams where id = $1 returning id`, [id])
  if (deleted.length === 0) return null
  return { sync: buildSyncMeta(new Date().toISOString()) }
}
