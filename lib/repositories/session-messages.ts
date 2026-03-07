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
  metadata?: Record<string, unknown>
}

export type ChatToolEventPhase = "tool_start" | "tool_result" | "tool_error"

export type ChatToolEventRecord = {
  id: string | number
  message_id: string | number
  tool_name: string
  phase: ChatToolEventPhase
  payload: Record<string, unknown>
  duration_ms?: number | null
  created_at?: string
}

export type MessageListCursor = {
  createdAt: string
  id: string
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
  cursor?: MessageListCursor | null,
): Promise<ChatSessionMessage[]> {
  const hasLimit = typeof limit === "number" && Number.isFinite(limit) && limit > 0

  try {
    const params: Array<string | number> = [sessionId]
    const cursorClause = cursor
      ? ` and (m.created_at > $${params.push(String(cursor.createdAt))} or (m.created_at = $${params.push(String(cursor.createdAt))} and m.id > $${params.push(Number(cursor.id))}))`
      : ""
    const limitClause = hasLimit ? ` limit $${params.push(Math.floor(limit as number))}` : ""

    return await queryMany<ChatSessionMessage>(
      `select m.id,
              m.session_id,
              m.role,
              m.content,
              m.created_at,
              m.updated_at,
              m.deleted_at,
              m.message_type,
              case
                when count(te.id) = 0 then '{}'::jsonb
                else jsonb_build_object(
                  'toolEvents',
                  jsonb_agg(
                    jsonb_build_object(
                      'id', te.id,
                      'type', te.phase,
                      'tool', te.tool_name,
                      'executionId', coalesce(te.payload->>'executionId', te.payload->>'execution_id', te.id::text),
                      'messageId', te.message_id::text,
                      'startedAt', coalesce(te.payload->>'startedAt', te.payload->>'started_at'),
                      'finishedAt', coalesce(te.payload->>'finishedAt', te.payload->>'finished_at'),
                      'durationMs', coalesce((te.payload->>'durationMs')::int, te.duration_ms),
                      'timeoutMs', (te.payload->>'timeoutMs')::int,
                      'retryCount', (te.payload->>'retryCount')::int,
                      'attempts', (te.payload->>'attempts')::int,
                      'fromCache', (te.payload->>'fromCache')::boolean,
                      'errorCode', coalesce(te.payload->>'errorCode', te.payload->>'error_code'),
                      'errorMessage', coalesce(te.payload->>'errorMessage', te.payload->>'error_message'),
                      'failureReason', coalesce(te.payload->>'failureReason', te.payload->>'failure_reason'),
                      'result', te.payload->'result',
                      'payload', te.payload
                    )
                    order by te.created_at asc, te.id asc
                  )
                )
              end as metadata
       from runash_chat_session_messages m
       left join chat_tool_events te on te.message_id = m.id
       where m.session_id=$1 and m.deleted_at is null${cursorClause}
       group by m.id
       order by m.created_at asc, m.id asc${limitClause}`,
      params,
    )
  } catch {
    return []
  }
}

export async function createChatToolEvents(
  messageId: string | number,
  events: Array<{
    toolName: string
    phase: ChatToolEventPhase
    payload: Record<string, unknown>
    durationMs?: number
  }>,
): Promise<ChatToolEventRecord[]> {
  if (!events.length) return []

  return runInTransaction(async () => {
    const created: ChatToolEventRecord[] = []

    for (const event of events) {
      const rows = await sql<ChatToolEventRecord[]>`
        insert into chat_tool_events (message_id, tool_name, phase, payload, duration_ms)
        values (${messageId}, ${event.toolName}, ${event.phase}, ${JSON.stringify(event.payload)}::jsonb, ${event.durationMs ?? null})
        returning id, message_id, tool_name, phase, payload, duration_ms, created_at
      `
      if (rows[0]) created.push(rows[0])
    }

    return created
  })
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
