import { one, queryMany, sql } from "@/lib/db"

export type ChatSessionMessage = {
  id: string | number
  session_id: string
  role: "assistant" | "user"
  content: string
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  message_type?: "text" | "product" | "recipe" | "tip" | "automation"
}

async function runInTransaction<T>(operation: () => Promise<T>): Promise<T> {
  await (sql as any).unsafe("BEGIN")
  try {
    const result = await operation()
    await (sql as any).unsafe("COMMIT")
    return result
  } catch (error) {
    await (sql as any).unsafe("ROLLBACK")
    throw error
  }
}

export async function createChatSessionMessage(
  sessionId: string,
  role: ChatSessionMessage["role"],
  content: string,
  messageType?: ChatSessionMessage["message_type"],
): Promise<ChatSessionMessage> {
  return runInTransaction(async () => {
    const rows = await sql<ChatSessionMessage[]>`
      insert into runash_chat_session_messages (session_id, role, content, message_type)
      values (${sessionId}, ${role}, ${content}, ${messageType ?? "text"})
      returning id, session_id, role, content, created_at, updated_at, deleted_at, message_type
    `

    await sql`
      update runash_chat_sessions
      set updated_at=now()
      where id=${sessionId}
    `

    return rows[0]
  })
}

export async function listMessagesBySession(
  sessionId: string,
  limit?: number,
  cursor?: string | number | null,
): Promise<ChatSessionMessage[]> {
  const hasLimit = typeof limit === "number" && Number.isFinite(limit) && limit > 0

  try {
    const params: Array<string | number> = [sessionId]
    const cursorClause = cursor ? ` and id < $${params.push(cursor)}` : ""
    const limitClause = hasLimit ? ` limit $${params.push(Math.floor(limit as number))}` : ""

    return await queryMany<ChatSessionMessage>(
      `select id, session_id, role, content, created_at, updated_at, deleted_at, message_type
       from runash_chat_session_messages
       where session_id=$1 and deleted_at is null${cursorClause}
       order by id desc${limitClause}`,
      params,
    )
  } catch {
    return []
  }
}

export async function getMessageBySession(
  sessionId: string,
  messageId: string | number,
): Promise<ChatSessionMessage | null> {
  return one<ChatSessionMessage>(sql<ChatSessionMessage[]>`
    select id, session_id, role, content, created_at, updated_at, deleted_at, message_type
    from runash_chat_session_messages
    where session_id=${sessionId} and id=${messageId} and deleted_at is null
    limit 1
  `)
}

export async function updateChatSessionMessage(
  sessionId: string,
  messageId: string | number,
  content: string,
  editorUserId: string,
): Promise<ChatSessionMessage | null> {
  return runInTransaction(async () => {
    const rows = await sql<ChatSessionMessage[]>`
      with target as (
        select id, content as previous_content
        from runash_chat_session_messages
        where session_id=${sessionId} and id=${messageId} and deleted_at is null and role='user'
        for update
      ),
      updated as (
        update runash_chat_session_messages
        set content=${content},
            updated_at=now()
        where id in (select id from target)
        returning id, session_id, role, content, created_at, updated_at, deleted_at, message_type
      ),
      audit as (
        insert into runash_chat_message_audit_logs (session_id, message_id, actor_user_id, action, previous_content, next_content)
        select ${sessionId}, id, ${editorUserId}, 'edit', previous_content, ${content}
        from target
      )
      select id, session_id, role, content, created_at, updated_at, deleted_at, message_type
      from updated
    `

    if (rows.length === 0) {
      return null
    }

    await sql`
      update runash_chat_sessions
      set updated_at=now()
      where id=${sessionId}
    `

    return rows[0]
  })
}

export async function deleteChatSessionMessage(
  sessionId: string,
  messageId: string | number,
  actorUserId: string,
): Promise<boolean> {
  return runInTransaction(async () => {
    const rows = await sql<{ id: string | number }[]>`
      with target as (
        select id, content
        from runash_chat_session_messages
        where session_id=${sessionId} and id=${messageId} and deleted_at is null
        for update
      ),
      updated as (
        update runash_chat_session_messages
        set deleted_at=now(),
            updated_at=now(),
            content='[deleted]'
        where id in (select id from target)
        returning id
      ),
      audit as (
        insert into runash_chat_message_audit_logs (session_id, message_id, actor_user_id, action, previous_content, next_content)
        select ${sessionId}, id, ${actorUserId}, 'delete', content, '[deleted]'
        from target
      )
      select id from updated
    `

    if (rows.length === 0) {
      return false
    }

    await sql`
      update runash_chat_sessions
      set updated_at=now()
      where id=${sessionId}
    `

    return true
  })
}
