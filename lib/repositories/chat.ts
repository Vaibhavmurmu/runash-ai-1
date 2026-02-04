import { one, queryMany, sql } from "@/lib/db"

export type Chat = {
  id: string
  user_id: string
  title: string
  created_at?: string
  updated_at?: string
}

export type Message = {
  id: string
  chat_id: string
  role: "user" | "assistant" | "system"
  content: string
  created_at?: string
}

export async function listChats(userId: string): Promise<Chat[]> {
  try {
    return queryMany<Chat>(
      `select id, user_id, title, created_at, updated_at from chats where user_id=$1 order by updated_at desc, created_at desc`,
      [userId],
    )
  } catch {
    return []
  }
}

export async function getChat(id: string, userId: string): Promise<Chat | null> {
  return one<Chat>(
    sql<
      Chat[]
    >`select id, user_id, title, created_at, updated_at from chats where id=${id} and user_id=${userId} limit 1`,
  )
}

export async function createChat(userId: string, title = "New Chat"): Promise<Chat> {
  const rows = await sql<Chat[]>`
    insert into chats (user_id, title)
    values (${userId}, ${title})
    returning id, user_id, title, created_at, updated_at
  `
  return rows[0]
}

export async function updateChat(id: string, userId: string, title: string): Promise<Chat | null> {
  const rows = await sql<Chat[]>`
    update chats set title=${title}, updated_at=now() where id=${id} and user_id=${userId} returning id, user_id, title, created_at, updated_at
  `
  return rows[0] ?? null
}

export async function deleteChat(id: string, userId: string): Promise<boolean> {
  // delete messages cascade (if FK), else manual
  await sql`delete from messages where chat_id=${id}`
  const rows = await sql<{ id: string }[]>`delete from chats where id=${id} and user_id=${userId} returning id`
  return rows.length > 0
}

export async function listMessages(chatId: string, userId: string): Promise<Message[]> {
  try {
    return queryMany<Message>(
      `select m.id, m.chat_id, m.role, m.content, m.created_at
       from messages m join chats c on c.id=m.chat_id
       where m.chat_id=$1 and c.user_id=$2
       order by m.created_at asc`,
      [chatId, userId],
    )
  } catch {
    return []
  }
}

export async function addMessage(chatId: string, role: Message["role"], content: string): Promise<Message> {
  const rows = await sql<Message[]>`
    insert into messages (chat_id, role, content)
    values (${chatId}, ${role}, ${content})
    returning id, chat_id, role, content, created_at
  `
  // bump chat updated_at
  await sql`update chats set updated_at=now() where id=${chatId}`
  return rows[0]
}

export async function updateMessage(id: string, userId: string, content: string): Promise<Message | null> {
  const rows = await sql<Message[]>`
    update messages set content=${content}
    where id=${id} and chat_id in (select id from chats where user_id=${userId})
    returning id, chat_id, role, content, created_at
  `
  return rows[0] ?? null
}

export async function deleteMessage(id: string, userId: string): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`
    delete from messages
    where id=${id} and chat_id in (select id from chats where user_id=${userId})
    returning id
  `
  return rows.length > 0
}
