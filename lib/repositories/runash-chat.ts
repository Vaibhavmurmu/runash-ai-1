import fs from "fs"
import path from "path"

import { sql } from "@/lib/db"
import {
  createChatSession,
  getChatSessionById,
  getMostRecentChatSession,
  listChatSessions,
  softDeleteChatSession,
  type ChatSession,
  updateChatSessionState,
} from "@/lib/repositories/sessions"
import {
  createChatSessionMessage,
  deleteChatSessionMessage,
  listMessagesBySession,
  type ChatSessionMessage,
  updateChatSessionMessage,
} from "@/lib/repositories/session-messages"

const DATA_DIR = path.join(process.cwd(), "data")
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json")
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json")

const useDatabaseBackedChatStorage = process.env.RUNASH_CHAT_DB_REPOSITORY_ENABLED === "true"

export type RunashSession = Pick<ChatSession, "id" | "title" | "created_at" | "archived_at"> & { deleted_at?: string | null }

export type RunashSessionMessage = ChatSessionMessage

function ensureDataFile(filePath: string, initialValue: string) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR)
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, initialValue)
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  ensureDataFile(filePath, JSON.stringify(fallback))

  try {
    const raw = fs.readFileSync(filePath, "utf-8")
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJsonFile<T>(filePath: string, value: T) {
  ensureDataFile(filePath, JSON.stringify(Array.isArray(value) ? [] : {}))
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

function requireUserId(userId?: string | null) {
  const normalized = String(userId ?? "").trim()
  if (!normalized) {
    throw new Error("USER_CONTEXT_REQUIRED")
  }

  return normalized
}

function mapSession(session: ChatSession): RunashSession {
  return {
    id: session.id,
    title: session.title,
    created_at: session.created_at,
    archived_at: session.archived_at ?? null,
    deleted_at: session.deleted_at ?? null,
  }
}

export async function listSessions(userId: string): Promise<RunashSession[]> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage) {
    const sessions = await listChatSessions(normalizedUserId)
    return sessions.map(mapSession)
  }

  return readJsonFile<RunashSession[]>(SESSIONS_FILE, []).filter((session) => !session.deleted_at)
}

export async function createSession(title = "Session", userId: string): Promise<RunashSession> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage) {
    const session = await createChatSession(normalizedUserId, title)
    return mapSession(session)
  }

  const sessions = await listSessions(normalizedUserId)
  const newSession: RunashSession = {
    id: `s-${Date.now()}`,
    title,
    created_at: new Date().toISOString(),
    archived_at: null,
    deleted_at: null,
  }

  sessions.unshift(newSession)
  writeJsonFile(SESSIONS_FILE, sessions)

  return newSession
}

export async function updateSession(
  sessionId: string,
  updates: { title?: string; archived?: boolean },
  userId: string,
): Promise<RunashSession | null> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage) {
    const session = await updateChatSessionState(normalizedUserId, sessionId, updates)
    return session ? mapSession(session) : null
  }

  const sessions = readJsonFile<RunashSession[]>(SESSIONS_FILE, [])
  const matchIndex = sessions.findIndex((session) => String(session.id) === String(sessionId) && !session.deleted_at)
  if (matchIndex < 0) return null

  sessions[matchIndex] = {
    ...sessions[matchIndex],
    ...(updates.title ? { title: updates.title } : {}),
    ...(typeof updates.archived === "boolean" ? { archived_at: updates.archived ? new Date().toISOString() : null } : {}),
  }

  writeJsonFile(SESSIONS_FILE, sessions)
  return sessions[matchIndex]
}

export async function softDeleteSession(sessionId: string, userId: string): Promise<boolean> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage) {
    return softDeleteChatSession(normalizedUserId, sessionId)
  }

  const sessions = readJsonFile<RunashSession[]>(SESSIONS_FILE, [])
  const matchIndex = sessions.findIndex((session) => String(session.id) === String(sessionId) && !session.deleted_at)
  if (matchIndex < 0) return false
  sessions[matchIndex] = { ...sessions[matchIndex], deleted_at: new Date().toISOString() }
  writeJsonFile(SESSIONS_FILE, sessions)
  return true
}

export async function getMostRecentSession(userId: string): Promise<RunashSession | null> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage) {
    const session = await getMostRecentChatSession(normalizedUserId)
    return session ? mapSession(session) : null
  }

  const sessions = await listSessions(normalizedUserId)
  return sessions[0] ?? null
}

export async function listSessionMessages(sessionId: string, limit: number | undefined, userId: string, cursor?: string): Promise<RunashSessionMessage[]> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage) {
    const ownerSession = await getChatSessionById(normalizedUserId, String(sessionId))
    if (!ownerSession) {
      throw new Error("SESSION_ACCESS_DENIED")
    }

    return listMessagesBySession(String(sessionId), limit, cursor)
  }

  const isOwned = await isSessionOwnedByUser(sessionId, normalizedUserId)
  if (!isOwned) {
    throw new Error("SESSION_ACCESS_DENIED")
  }

  const messages = readJsonFile<RunashSessionMessage[]>(MESSAGES_FILE, [])
  const normalizedSessionId = String(sessionId)

  const filtered = messages
    .filter((message) => String(message.session_id) === normalizedSessionId && !message.deleted_at)
    .sort((a, b) => Number(b.id) - Number(a.id))

  const cursorValue = cursor ? Number(cursor) : null
  const cursorFiltered = cursorValue ? filtered.filter((message) => Number(message.id) < cursorValue) : filtered

  if (!limit || limit < 1) return cursorFiltered
  return cursorFiltered.slice(0, limit)
}

export async function isSessionOwnedByUser(sessionId: string, userId: string): Promise<boolean> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage) {
    const session = await getChatSessionById(normalizedUserId, String(sessionId))
    return Boolean(session)
  }

  const sessions = await listSessions(normalizedUserId)
  return sessions.some((session) => String(session.id) === String(sessionId))
}

export async function getMessageByIdForUser(messageId: string | number, userId: string): Promise<RunashSessionMessage | null> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage) {
    const rows = await (sql as any).unsafe(
      `select m.id, m.session_id, m.role, m.content, m.created_at, m.updated_at, m.deleted_at, m.message_type
       from runash_chat_session_messages m
       inner join runash_chat_sessions s on s.id = m.session_id
       where m.id = $1 and s.user_id = $2 and s.deleted_at is null and m.deleted_at is null
       limit 1`,
      [messageId, normalizedUserId],
    )

    return rows?.[0] ?? null
  }

  const messages = readJsonFile<RunashSessionMessage[]>(MESSAGES_FILE, [])
  return messages.find((message) => String(message.id) === String(messageId) && !message.deleted_at) ?? null
}

export async function updateSessionMessage(
  sessionId: string,
  messageId: string | number,
  content: string,
  userId: string,
): Promise<RunashSessionMessage | null> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage) {
    const ownerSession = await getChatSessionById(normalizedUserId, String(sessionId))
    if (!ownerSession) {
      throw new Error("SESSION_ACCESS_DENIED")
    }

    return updateChatSessionMessage(sessionId, messageId, content, normalizedUserId)
  }

  const isOwned = await isSessionOwnedByUser(sessionId, normalizedUserId)
  if (!isOwned) {
    throw new Error("SESSION_ACCESS_DENIED")
  }

  const messages = readJsonFile<RunashSessionMessage[]>(MESSAGES_FILE, [])
  const normalizedSessionId = String(sessionId)
  const normalizedMessageId = String(messageId)
  const matchIndex = messages.findIndex(
    (message) => String(message.session_id) === normalizedSessionId && String(message.id) === normalizedMessageId && !message.deleted_at,
  )

  if (matchIndex < 0 || messages[matchIndex].role !== "user") {
    return null
  }

  const updatedMessage: RunashSessionMessage = {
    ...messages[matchIndex],
    content,
    updated_at: new Date().toISOString(),
  }

  messages[matchIndex] = updatedMessage
  writeJsonFile(MESSAGES_FILE, messages)

  return updatedMessage
}

export async function deleteSessionMessage(sessionId: string, messageId: string | number, userId: string): Promise<boolean> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage) {
    const ownerSession = await getChatSessionById(normalizedUserId, String(sessionId))
    if (!ownerSession) {
      throw new Error("SESSION_ACCESS_DENIED")
    }

    return deleteChatSessionMessage(sessionId, messageId, normalizedUserId)
  }

  const isOwned = await isSessionOwnedByUser(sessionId, normalizedUserId)
  if (!isOwned) {
    throw new Error("SESSION_ACCESS_DENIED")
  }

  const messages = readJsonFile<RunashSessionMessage[]>(MESSAGES_FILE, [])
  const normalizedSessionId = String(sessionId)
  const normalizedMessageId = String(messageId)
  const matchIndex = messages.findIndex(
    (message) => String(message.session_id) === normalizedSessionId && String(message.id) === normalizedMessageId && !message.deleted_at,
  )

  if (matchIndex < 0) {
    return false
  }

  messages[matchIndex] = {
    ...messages[matchIndex],
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    content: "[deleted]",
  }

  writeJsonFile(MESSAGES_FILE, messages)
  return true
}

export async function createSessionMessage(
  sessionId: string,
  role: RunashSessionMessage["role"],
  content: string,
  messageType: RunashSessionMessage["message_type"] = "text",
  userId: string,
): Promise<RunashSessionMessage> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage) {
    const ownerSession = await getChatSessionById(normalizedUserId, String(sessionId))
    if (!ownerSession) {
      throw new Error("SESSION_ACCESS_DENIED")
    }

    return createChatSessionMessage(sessionId, role, content, messageType)
  }

  const isOwned = await isSessionOwnedByUser(sessionId, normalizedUserId)
  if (!isOwned) {
    throw new Error("SESSION_ACCESS_DENIED")
  }

  const messages = readJsonFile<RunashSessionMessage[]>(MESSAGES_FILE, [])
  const newMessage: RunashSessionMessage = {
    id: Date.now(),
    session_id: String(sessionId),
    role,
    content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    message_type: messageType,
  }

  messages.unshift(newMessage)
  writeJsonFile(MESSAGES_FILE, messages)

  return newMessage
}
