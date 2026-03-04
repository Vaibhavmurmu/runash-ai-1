import { queryMany, sql } from "@/lib/db"

export interface ChatMessage {
  id: string
  stream_id: string
  user_id: string
  username: string
  message: string
  message_type: "message" | "donation" | "follow" | "subscription" | "chat"
  platform: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface Stream {
  id: string
  title: string
  description: string | null
  user_id: string
  status: "scheduled" | "live" | "ended" | "deleted"
  platform: string
  stream_key: string
  viewer_count: number
  created_at: string
  started_at: string | null
  ended_at: string | null
  total_views?: number
  peak_viewers?: number
  average_viewers?: number
  watch_time?: number
  chat_messages?: number
  new_followers?: number
  donations?: number
  engagement?: number
  bitrate?: number
  dropped_frames?: number
}

export interface Recording {
  id: string
  stream_id: string
  file_url: string
  thumbnail_url: string | null
  duration: number
  file_size: number
  view_count: number
  created_at: string
  updated_at?: string | null
  title?: string | null
  description?: string | null
  quality?: string | null
  status?: string | null
  privacy?: "public" | "private" | null
  tags?: string[] | null
  user_id?: string
}

export interface ChatMessagesQuery {
  streamId: string
  userId: string
  limit?: number
  offset?: number
  cursor?: string | null
}

export interface Database {
  query<T = Record<string, unknown>>(query: string, params?: unknown[]): Promise<T[]>
  createStream(data: Omit<Stream, "id" | "created_at" | "started_at" | "ended_at">): Promise<Stream>
  getStream(id: string): Promise<Stream | null>
  getStreamById(id: string | number): Promise<Stream | null>
  updateStream(id: string | number, data: Record<string, unknown>): Promise<Stream>
  getUserStreams(userId: string): Promise<Stream[]>
  createRecording(data: Partial<Recording> & { stream_id: string; duration: number; file_size: number }): Promise<Recording>
  getRecordings(streamId: string): Promise<Recording[]>
  getUserRecordings(userId: string): Promise<Recording[]>
  getRecording(id: string): Promise<Recording | null>
  updateRecording(id: string, data: Record<string, unknown>): Promise<Recording | null>
  deleteRecording(id: string): Promise<void>
  saveChatMessage(data: {
    streamId: string
    userId: string
    username: string
    message: string
    type: string
    platform: string
    metadata: Record<string, unknown>
  }): Promise<ChatMessage>
  getChatMessages(params: ChatMessagesQuery): Promise<ChatMessage[]>
  getStreamChat(streamId: string | number, limit?: number): Promise<ChatMessage[]>
  getActiveViewers(streamId: string | number): Promise<Array<{ count: number }>>
}

function toChatMessage(row: Record<string, any>): ChatMessage {
  return {
    id: String(row.id),
    stream_id: String(row.stream_id),
    user_id: String(row.user_id),
    username: String(row.username),
    message: String(row.message),
    message_type: (row.message_type ?? row.type ?? "message") as ChatMessage["message_type"],
    platform: String(row.platform ?? "custom"),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: new Date(row.created_at ?? row.timestamp ?? Date.now()).toISOString(),
  }
}

export const Database: Database = {
  async query<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
    return queryMany<T>(query, params)
  },

  async createStream(data) {
    const result = await sql`
      INSERT INTO streams (title, description, user_id, status, platform, stream_key, viewer_count)
      VALUES (${data.title}, ${data.description}, ${data.user_id}, ${data.status}, ${data.platform}, ${data.stream_key}, ${data.viewer_count})
      RETURNING *
    `
    return result[0] as Stream
  },

  async getStream(id) {
    return this.getStreamById(id)
  },

  async getStreamById(id) {
    const result = await sql`SELECT * FROM streams WHERE id::text = ${String(id)} LIMIT 1`
    return (result[0] as Stream) || null
  },

  async updateStream(id, data) {
    const entries = Object.entries(data).filter(([, value]) => value !== undefined)
    if (entries.length === 0) {
      const current = await this.getStreamById(id)
      if (!current) throw new Error("Stream not found")
      return current
    }

    const normalized = entries.map(([key, value]) => [key === "start_time" ? "started_at" : key, value] as const)
    const setClause = normalized.map(([key], index) => `${key} = $${index + 2}`).join(", ")
    const values = [String(id), ...normalized.map(([, value]) => value)]

    const rows = await queryMany<Stream>(`UPDATE streams SET ${setClause} WHERE id::text = $1 RETURNING *`, values)
    if (!rows[0]) throw new Error("Stream not found")
    return rows[0]
  },

  async getUserStreams(userId) {
    const result = await sql`SELECT * FROM streams WHERE user_id = ${userId} ORDER BY created_at DESC`
    return result as Stream[]
  },

  async createRecording(data) {
    const fileUrl = data.file_url ?? data.recording_url ?? ""
    const result = await sql`
      INSERT INTO recordings (stream_id, file_url, thumbnail_url, duration, file_size)
      VALUES (${data.stream_id}, ${fileUrl}, ${data.thumbnail_url ?? null}, ${data.duration}, ${data.file_size})
      RETURNING *
    `
    return result[0] as Recording
  },

  async getRecordings(streamId) {
    const result = await sql`
      SELECT r.*, s.user_id
      FROM recordings r
      INNER JOIN streams s ON s.id = r.stream_id
      WHERE r.stream_id::text = ${String(streamId)}
      ORDER BY r.created_at DESC
    `
    return result as Recording[]
  },

  async getUserRecordings(userId) {
    const result = await sql`
      SELECT r.*, s.user_id
      FROM recordings r
      INNER JOIN streams s ON s.id = r.stream_id
      WHERE s.user_id = ${userId}
      ORDER BY r.created_at DESC
    `
    return result as Recording[]
  },

  async getRecording(id) {
    const result = await sql`
      SELECT r.*, s.user_id
      FROM recordings r
      INNER JOIN streams s ON s.id = r.stream_id
      WHERE r.id::text = ${id}
      LIMIT 1
    `
    return (result[0] as Recording) || null
  },

  async updateRecording(id, data) {
    const entries = Object.entries(data).filter(([, value]) => value !== undefined)
    if (entries.length === 0) {
      return this.getRecording(id)
    }

    const setClause = entries.map(([key], index) => `${key} = $${index + 2}`).join(", ")
    const values = [id, ...entries.map(([, value]) => value)]
    const rows = await queryMany<Recording>(`UPDATE recordings SET ${setClause} WHERE id::text = $1 RETURNING *`, values)
    return rows[0] ?? null
  },

  async deleteRecording(id) {
    await sql`DELETE FROM recordings WHERE id::text = ${id}`
  },

  async saveChatMessage(data) {
    const result = await sql`
      INSERT INTO chat_messages (stream_id, user_id, username, message, message_type, platform, metadata)
      VALUES (${data.streamId}, ${data.userId}, ${data.username}, ${data.message}, ${data.type}, ${data.platform}, ${JSON.stringify(data.metadata)})
      RETURNING *
    `
    return toChatMessage(result[0])
  },

  async getChatMessages({ streamId, userId, limit = 50, offset = 0, cursor }) {
    const params: unknown[] = [streamId, userId, limit, offset]
    const cursorFilter = cursor ? `AND cm.created_at < $5::timestamptz` : ""
    if (cursor) params.push(cursor)

    const rows = await queryMany(
      `SELECT cm.*
       FROM chat_messages cm
       INNER JOIN streams s ON s.id = cm.stream_id
       WHERE cm.stream_id::text = $1
         AND s.user_id = $2
         ${cursorFilter}
       ORDER BY cm.created_at DESC
       LIMIT $3 OFFSET $4`,
      params,
    )

    return rows.map((row) => toChatMessage(row as Record<string, unknown>))
  },

  async getStreamChat(streamId, limit = 100) {
    const result = await sql`
      SELECT * FROM chat_messages
      WHERE stream_id::text = ${String(streamId)}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return result.map((row) => toChatMessage(row as Record<string, unknown>))
  },

  async getActiveViewers(streamId) {
    const rows = await sql`
      SELECT COALESCE(viewer_count, 0)::int AS count
      FROM streams
      WHERE id::text = ${String(streamId)}
      LIMIT 1
    `
    return rows.map((row) => ({ count: Number(row.count ?? 0) }))
  },
}

export const DatabaseService = {
  getChatMessages: Database.getChatMessages.bind(Database),
}
