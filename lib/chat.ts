// Simple chat storage with Postgres persistence + Redis cache fallback
import { Redis } from "@upstash/redis"
import { one, queryMany, sql } from "@/lib/db"

type ChatAttachment = {
  name: string
  type: string
  size: number
  url?: string
  checksum?: string
}

type ChatMessage = {
  id: string
  streamId: string
  userId: string
  username: string
  text: string
  createdAt: number
}

let _redis: Redis | null = null
let _dbInit: Promise<void> | null = null

function redis() {
  if (_redis) return _redis
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  _redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! })
  return _redis
}

const mem = new Map<string, ChatMessage[]>()

function listKey(streamId: string) {
  return `chat:${streamId}:messages`
}

async function ensureDurableTables() {
  await sql`
    create table if not exists stream_chat_messages (
      id text primary key,
      stream_id text not null,
      user_id text not null,
      username text not null,
      text_content text not null,
      dedupe_key text,
      created_at timestamptz not null default now()
    )
  `
  await sql`alter table stream_chat_messages add column if not exists dedupe_key text`
  await sql`create unique index if not exists idx_stream_chat_messages_dedupe on stream_chat_messages (stream_id, dedupe_key) where dedupe_key is not null`

  await sql`
    create table if not exists stream_chat_message_attachments (
      id uuid primary key default gen_random_uuid(),
      message_id text not null references stream_chat_messages(id) on delete cascade,
      attachment_name text not null,
      attachment_type text not null,
      attachment_size integer not null,
      attachment_url text,
      attachment_checksum text,
      created_at timestamptz not null default now()
    )
  `
}

async function initDb() {
  if (!_dbInit) _dbInit = ensureDurableTables()
  await _dbInit
}

export async function addMessage(msg: Omit<ChatMessage, "id" | "createdAt"> & { dedupeKey?: string; attachments?: ChatAttachment[] }) {
  const m: ChatMessage = {
    ...msg,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  }

  try {
    await initDb()

    if (msg.dedupeKey) {
      const existing = await one<{ id: string; stream_id: string; user_id: string; username: string; text_content: string; created_at: string }>(sql`
        select id, stream_id, user_id, username, text_content, created_at
        from stream_chat_messages
        where stream_id=${m.streamId} and dedupe_key=${msg.dedupeKey}
        limit 1
      `)
      if (existing) {
        return {
          id: existing.id,
          streamId: existing.stream_id,
          userId: existing.user_id,
          username: existing.username,
          text: existing.text_content,
          createdAt: new Date(existing.created_at).getTime(),
        }
      }
    }

    await sql`
      insert into stream_chat_messages (id, stream_id, user_id, username, text_content, dedupe_key)
      values (${m.id}, ${m.streamId}, ${m.userId}, ${m.username}, ${m.text}, ${msg.dedupeKey ?? null})
    `

    if (msg.attachments?.length) {
      for (const attachment of msg.attachments) {
        await sql`
          insert into stream_chat_message_attachments (message_id, attachment_name, attachment_type, attachment_size, attachment_url, attachment_checksum)
          values (${m.id}, ${attachment.name}, ${attachment.type}, ${attachment.size}, ${attachment.url ?? null}, ${attachment.checksum ?? null})
        `
      }
    }
  } catch {
    const r = redis()
    if (r) {
      await r.lpush(listKey(m.streamId), JSON.stringify(m))
      await r.ltrim(listKey(m.streamId), 0, 999)
    } else {
      const arr = mem.get(m.streamId) ?? []
      arr.unshift(m)
      mem.set(m.streamId, arr.slice(0, 1000))
    }
  }

  return m
}

export async function getMessages(streamId: string, limit = 100) {
  try {
    await initDb()
    const rows = await queryMany<{ id: string; stream_id: string; user_id: string; username: string; text_content: string; created_at: string }>(
      `select id, stream_id, user_id, username, text_content, created_at
       from stream_chat_messages
       where stream_id = $1
       order by created_at desc
       limit $2`,
      [streamId, limit],
    )

    return rows
      .map((row) => ({
        id: row.id,
        streamId: row.stream_id,
        userId: row.user_id,
        username: row.username,
        text: row.text_content,
        createdAt: new Date(row.created_at).getTime(),
      }))
      .sort((a, b) => a.createdAt - b.createdAt)
  } catch {
    const r = redis()
    if (r) {
      const raw = await r.lrange(listKey(streamId), 0, limit - 1)
      return raw.map((s) => JSON.parse(s) as ChatMessage).sort((a, b) => a.createdAt - b.createdAt)
    }

    const arr = mem.get(streamId) ?? []
    return [...arr].reverse().slice(Math.max(0, arr.length - limit))
  }
}
