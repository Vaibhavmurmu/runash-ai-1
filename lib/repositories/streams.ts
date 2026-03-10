import { one, queryMany, sql } from "@/lib/db"
import type { UUID } from "@/lib/types"
import type {
  DashboardRecentStream,
  DashboardScheduledStream,
  DashboardStreamTemplate,
} from "@/lib/types/dashboard-streams"

export type ActiveLiveStreamSession = {
  id: string
  userId: string
  title: string
  description: string | null
  category: string | null
  status: "live"
  startTime: string | null
  maxViewers: number
  viewerCount: number
  totalRevenue: number
  thumbnailUrl: string | null
  streamUrl: string | null
  hostName: string
  hostAvatar: string | null
  tags: string[]
  featuredProducts: string[]
}

export type StreamCommercialStats = {
  purchases: number
  revenue: number
}

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

type StreamTemplateRow = {
  id: string
  user_id: string
  name: string
  title: string
  description: string
  duration: number
  platforms: string[] | string | null
  thumbnail: string | null
  tags: string[] | string | null
  category: string
  is_public: boolean
  created_at: string
  updated_at: string
}

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

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item)).filter(Boolean)
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

async function ensureStreamTemplatesTable() {
  await sql`
    create table if not exists stream_dashboard_templates (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      name text not null,
      title text not null,
      description text not null default '',
      duration integer not null default 60,
      platforms jsonb not null default '[]'::jsonb,
      thumbnail text,
      tags jsonb not null default '[]'::jsonb,
      category text not null default 'Gaming',
      is_public boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `
  await sql`create index if not exists idx_stream_dashboard_templates_user_id on stream_dashboard_templates(user_id)`
  await sql`create index if not exists idx_stream_dashboard_templates_updated_at on stream_dashboard_templates(updated_at desc)`
}

function toStreamTemplate(row: StreamTemplateRow): DashboardStreamTemplate {
  const platforms = parseSettings(row.platforms)
  const tags = parseSettings(row.tags)

  return {
    id: row.id,
    name: row.name,
    title: row.title,
    description: row.description ?? "",
    duration: Number(row.duration ?? 60),
    platforms: Array.isArray(platforms) ? platforms.map(String) : [],
    thumbnail: row.thumbnail ?? undefined,
    tags: Array.isArray(tags) ? tags.map(String) : [],
    category: row.category,
    isPublic: Boolean(row.is_public),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
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
}

export async function createDashboardScheduledStream(userId: string, input: DashboardScheduledStream) {
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
}

export async function listDashboardRecentStreams(userId: string, limit = 6): Promise<DashboardRecentStream[]> {
  const rows = await queryMany<Stream>(
    `select * from streams where user_id=$1 and status in ('live', 'ended') order by coalesce(actual_start, created_at) desc limit $2`,
    [userId, limit],
  )
  return rows.map(toRecentStream)
}

export async function listDashboardScheduledStreams(userId: string): Promise<DashboardScheduledStream[]> {
  const rows = await queryMany<Stream>(
    `select * from streams where user_id=$1 and status='scheduled' order by coalesce(scheduled_start, created_at) asc`,
    [userId],
  )
  return rows.map(toScheduledStream)
}

export async function createDashboardStreamInvite(userId: string, streamId: string, email: string): Promise<StreamInvite> {
  await ensureInviteTable()
  const rows = await sql<StreamInvite[]>`
    insert into stream_invites (user_id, stream_id, email)
    values (${userId}, ${streamId}, ${email})
    returning id, user_id, stream_id, email, sent_at
  `
  return rows[0]
}

export async function listDashboardStreamTemplates(userId: string): Promise<DashboardStreamTemplate[]> {
  await ensureStreamTemplatesTable()

  const rows = await queryMany<StreamTemplateRow>(
    `select id, user_id, name, title, description, duration, platforms, thumbnail, tags, category, is_public, created_at, updated_at
     from stream_dashboard_templates
     where user_id=$1
     order by updated_at desc`,
    [userId],
  )

  return rows.map(toStreamTemplate)
}

export async function createDashboardStreamTemplate(
  userId: string,
  input: Omit<DashboardStreamTemplate, "id" | "createdAt" | "updatedAt">,
): Promise<DashboardStreamTemplate> {
  await ensureStreamTemplatesTable()

  const rows = await sql<StreamTemplateRow[]>`
    insert into stream_dashboard_templates (
      user_id, name, title, description, duration, platforms, thumbnail, tags, category, is_public
    )
    values (
      ${userId}, ${input.name}, ${input.title}, ${input.description}, ${input.duration},
      ${JSON.stringify(input.platforms ?? [])}::jsonb,
      ${input.thumbnail ?? null},
      ${JSON.stringify(input.tags ?? [])}::jsonb,
      ${input.category}, ${input.isPublic}
    )
    returning id, user_id, name, title, description, duration, platforms, thumbnail, tags, category, is_public, created_at, updated_at
  `

  return toStreamTemplate(rows[0])
}

export async function updateDashboardStreamTemplate(
  userId: string,
  id: string,
  input: Partial<Omit<DashboardStreamTemplate, "id" | "createdAt" | "updatedAt">>,
): Promise<DashboardStreamTemplate | null> {
  await ensureStreamTemplatesTable()

  const current = await one<StreamTemplateRow>(sql<StreamTemplateRow[]>`
    select id, user_id, name, title, description, duration, platforms, thumbnail, tags, category, is_public, created_at, updated_at
    from stream_dashboard_templates
    where id=${id} and user_id=${userId}
    limit 1
  `)

  if (!current) return null

  const rows = await sql<StreamTemplateRow[]>`
    update stream_dashboard_templates
    set
      name=${input.name ?? current.name},
      title=${input.title ?? current.title},
      description=${input.description ?? current.description},
      duration=${input.duration ?? current.duration},
      platforms=${JSON.stringify(input.platforms ?? (Array.isArray(current.platforms) ? current.platforms : []))}::jsonb,
      thumbnail=${input.thumbnail ?? current.thumbnail},
      tags=${JSON.stringify(input.tags ?? (Array.isArray(current.tags) ? current.tags : []))}::jsonb,
      category=${input.category ?? current.category},
      is_public=${input.isPublic ?? current.is_public},
      updated_at=now()
    where id=${id} and user_id=${userId}
    returning id, user_id, name, title, description, duration, platforms, thumbnail, tags, category, is_public, created_at, updated_at
  `

  return rows[0] ? toStreamTemplate(rows[0]) : null
}

export async function deleteDashboardStreamTemplate(userId: string, id: string): Promise<boolean> {
  await ensureStreamTemplatesTable()

  const rows = await sql<{ id: string }[]>`
    delete from stream_dashboard_templates
    where id=${id} and user_id=${userId}
    returning id
  `

  return rows.length > 0
}

export async function getActiveLiveStreamSession(): Promise<ActiveLiveStreamSession | null> {
  const row = await one<{
    id: string
    user_id: string
    title: string
    description: string | null
    category: string | null
    status: "live"
    actual_start: string | null
    max_viewers: number
    viewer_count: number | null
    total_revenue: number
    thumbnail_url: string | null
    rtmp_url: string | null
    settings: Record<string, unknown> | string | null
    host_name: string | null
    host_avatar: string | null
  }>(sql`
    select
      s.id,
      s.user_id,
      s.title,
      s.description,
      s.category,
      s.status,
      s.actual_start,
      coalesce(s.max_viewers, 0) as max_viewers,
      coalesce(s.viewer_count, 0) as viewer_count,
      coalesce(s.total_revenue, 0) as total_revenue,
      s.thumbnail_url,
      s.rtmp_url,
      s.settings,
      coalesce(nullif(u.name, ''), nullif(u.email, ''), 'RunAsh Host') as host_name,
      nullif(u.image, '') as host_avatar
    from streams s
    left join users u on u.id = s.user_id
    where s.status = 'live'
    order by coalesce(s.actual_start, s.created_at) desc
    limit 1
  `)

  if (!row) return null

  const settings = parseSettings(row.settings)
  const tags = toStringList(settings.tags)
  const featuredProducts = toStringList(settings.featuredProducts).slice(0, 6)

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: "live",
    startTime: row.actual_start,
    maxViewers: Number(row.max_viewers ?? 0),
    viewerCount: Number(row.viewer_count ?? 0),
    totalRevenue: Number(row.total_revenue ?? 0),
    thumbnailUrl: row.thumbnail_url,
    streamUrl: row.rtmp_url,
    hostName: row.host_name ?? "RunAsh Host",
    hostAvatar: row.host_avatar,
    tags,
    featuredProducts,
  }
}

export async function listStreamProductReferences(productIds: string[]): Promise<string[]> {
  if (productIds.length === 0) return []

  const normalizedIds = productIds
    .map((productId) => Number.parseInt(productId, 10))
    .filter((productId) => Number.isInteger(productId))

  if (normalizedIds.length === 0) return []

  const rows = await queryMany<{ id: number }>(
    `select id from products where id = any($1::int[]) order by array_position($1::int[], id)`,
    [normalizedIds],
  )

  return rows.map((row) => String(row.id))
}

export async function getStreamCommercialStats(streamId: string, fallbackRevenue = 0): Promise<StreamCommercialStats> {
  const table = await one<{ exists: string | null }>(sql<{ exists: string | null }[]>`
    select to_regclass('public.payment_transactions') as exists
  `)

  if (!table?.exists) {
    return {
      purchases: 0,
      revenue: Number(fallbackRevenue || 0),
    }
  }

  const totals = await queryMany<{ purchases: number; revenue: number }>(
    `
      select
        count(*)::int as purchases,
        coalesce(sum(amount), 0)::numeric as revenue
      from payment_transactions
      where stream_id::text = $1
        and status = 'succeeded'
    `,
    [streamId],
  )

  const row = totals[0]

  return {
    purchases: Number(row?.purchases ?? 0),
    revenue: Math.max(Number(row?.revenue ?? 0), Number(fallbackRevenue || 0)),
  }
}
