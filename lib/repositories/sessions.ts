import { one, queryMany, sql } from "@/lib/db"

export type ChatSession = {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
  archived_at?: string | null
  deleted_at?: string | null
}

export type SessionListCursor = {
  updatedAt: string
  id: string
}

type ListChatSessionsOptions = {
  limit?: number
  cursor?: SessionListCursor | null
  query?: string
}

export async function listChatSessions(userId: string, options?: number | ListChatSessionsOptions): Promise<ChatSession[]> {
  const resolvedOptions = typeof options === "number" ? { limit: options } : options ?? {}
  const hasLimit = typeof resolvedOptions.limit === "number" && Number.isFinite(resolvedOptions.limit) && resolvedOptions.limit > 0
  const hasQuery = typeof resolvedOptions.query === "string" && resolvedOptions.query.trim().length > 0
  const hasCursor = Boolean(resolvedOptions.cursor?.updatedAt && resolvedOptions.cursor?.id)

  try {
    const params: Array<string | number> = [userId]
    const clauses = ["user_id=$1", "deleted_at is null"]

    if (hasQuery) {
      clauses.push(`title ilike $${params.push(`%${resolvedOptions.query?.trim()}%`)}`)
    }

    if (hasCursor) {
      clauses.push(`(updated_at < $${params.push(String(resolvedOptions.cursor?.updatedAt))} or (updated_at = $${params.push(String(resolvedOptions.cursor?.updatedAt))} and id < $${params.push(String(resolvedOptions.cursor?.id))}))`)
    }

    const limitClause = hasLimit ? ` limit $${params.push(Math.floor(resolvedOptions.limit as number))}` : ""

    return await queryMany<ChatSession>(
      `select id, user_id, title, created_at, updated_at, archived_at, deleted_at
       from runash_chat_sessions
       where ${clauses.join(" and ")}
       order by updated_at desc, id desc${limitClause}`,
      params,
    )
  } catch {
    return []
  }
}

export async function createChatSession(userId: string, title = "Session"): Promise<ChatSession> {
  const rows = await sql<ChatSession[]>`
    insert into runash_chat_sessions (user_id, title)
    values (${userId}, ${title})
    returning id, user_id, title, created_at, updated_at, archived_at, deleted_at
  `

  return rows[0]
}

export async function getMostRecentChatSession(userId: string): Promise<ChatSession | null> {
  return one<ChatSession>(sql<ChatSession[]>`
    select id, user_id, title, created_at, updated_at, archived_at, deleted_at
    from runash_chat_sessions
    where user_id=${userId} and deleted_at is null
    order by updated_at desc, id desc
    limit 1
  `)
}

export async function getChatSessionById(userId: string, sessionId: string): Promise<ChatSession | null> {
  return one<ChatSession>(sql<ChatSession[]>`
    select id, user_id, title, created_at, updated_at, archived_at, deleted_at
    from runash_chat_sessions
    where user_id=${userId} and id=${sessionId} and deleted_at is null
    limit 1
  `)
}

export async function updateChatSessionState(
  userId: string,
  sessionId: string,
  input: { title?: string; archived?: boolean },
): Promise<ChatSession | null> {
  const rows = await sql<ChatSession[]>`
    update runash_chat_sessions
    set title=coalesce(${input.title ?? null}, title),
        archived_at=case
          when ${typeof input.archived === "boolean" ? input.archived : null} is null then archived_at
          when ${input.archived ?? false} then now()
          else null
        end,
        updated_at=now()
    where user_id=${userId} and id=${sessionId} and deleted_at is null
    returning id, user_id, title, created_at, updated_at, archived_at, deleted_at
  `

  return rows[0] ?? null
}

export async function softDeleteChatSession(userId: string, sessionId: string): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`
    update runash_chat_sessions
    set deleted_at=now(),
        updated_at=now()
    where user_id=${userId} and id=${sessionId} and deleted_at is null
    returning id
  `

  return rows.length > 0
}
