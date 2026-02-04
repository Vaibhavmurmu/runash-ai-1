import type { UUID } from "@/lib/types"
import { one, queryMany, sql } from "@/lib/db"

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
