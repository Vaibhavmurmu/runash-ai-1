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

export async function listChatSessions(userId: string, limit?: number): Promise<ChatSession[]> {
  const hasLimit = typeof limit === "number" && Number.isFinite(limit) && limit > 0

  try {
    if (hasLimit) {
      return await queryMany<ChatSession>(
        `select id, user_id, title, created_at, updated_at, archived_at, deleted_at
         from runash_chat_sessions
         where user_id=$1 and deleted_at is null
         order by updated_at desc, created_at desc
         limit $2`,
        [userId, Math.floor(limit as number)],
      )
    }

    return await queryMany<ChatSession>(
      `select id, user_id, title, created_at, updated_at, archived_at, deleted_at
       from runash_chat_sessions
       where user_id=$1 and deleted_at is null
       order by updated_at desc, created_at desc`,
      [userId],
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
    order by updated_at desc, created_at desc
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
