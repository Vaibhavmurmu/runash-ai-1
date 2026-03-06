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
  type SessionListCursor,
  updateChatSessionState,
} from "@/lib/repositories/sessions"
import {
  createChatSessionMessage,
  deleteChatSessionMessage,
  listMessagesBySession,
  type ChatSessionMessage,
  type MessageListCursor,
  updateChatSessionMessage,
} from "@/lib/repositories/session-messages"

const DATA_DIR = path.join(process.cwd(), "data")
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json")
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json")

const LOCAL_DEV_FILE_STORAGE_FLAG = "RUNASH_CHAT_LOCAL_DEV_FILE_STORAGE"

export type RunashChatRepositoryAdapters = {
  listChatSessions: typeof listChatSessions
  createChatSession: typeof createChatSession
  updateChatSessionState: typeof updateChatSessionState
  softDeleteChatSession: typeof softDeleteChatSession
  getMostRecentChatSession: typeof getMostRecentChatSession
  getChatSessionById: typeof getChatSessionById
  listMessagesBySession: typeof listMessagesBySession
  createChatSessionMessage: typeof createChatSessionMessage
  updateChatSessionMessage: typeof updateChatSessionMessage
  deleteChatSessionMessage: typeof deleteChatSessionMessage
  getMessageByIdForUser: (messageId: string | number, userId: string) => Promise<RunashSessionMessage | null>
}

const defaultRepositoryAdapters: RunashChatRepositoryAdapters = {
  listChatSessions,
  createChatSession,
  updateChatSessionState,
  softDeleteChatSession,
  getMostRecentChatSession,
  getChatSessionById,
  listMessagesBySession,
  createChatSessionMessage,
  updateChatSessionMessage,
  deleteChatSessionMessage,
  async getMessageByIdForUser(messageId, userId) {
    const rows = await (sql as any).unsafe(
      `select m.id, m.session_id, m.role, m.content, m.created_at, m.updated_at, m.deleted_at, m.message_type
       from runash_chat_session_messages m
       inner join runash_chat_sessions s on s.id = m.session_id
       where m.id = $1 and s.user_id = $2 and s.deleted_at is null and m.deleted_at is null
       limit 1`,
      [messageId, userId],
    )

    return rows?.[0] ?? null
  },
}

let repositoryAdapters: RunashChatRepositoryAdapters = defaultRepositoryAdapters

function useDatabaseBackedChatStorage() {
  const localDevFileStorageEnabled = process.env[LOCAL_DEV_FILE_STORAGE_FLAG] === "true"
  const isProductionRuntime = process.env.NODE_ENV === "production"

  if (localDevFileStorageEnabled && !isProductionRuntime) {
    return false
  }

  return true
}

export function setRunashChatRepositoryAdaptersForTests(adapters: RunashChatRepositoryAdapters | null) {
  repositoryAdapters = adapters ?? defaultRepositoryAdapters
}

export type RunashSession = Pick<ChatSession, "id" | "title" | "created_at" | "updated_at" | "archived_at"> & { deleted_at?: string | null }

export type RunashSessionListCursor = SessionListCursor

export type RunashSessionMessageListCursor = MessageListCursor

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
    updated_at: session.updated_at,
    archived_at: session.archived_at ?? null,
    deleted_at: session.deleted_at ?? null,
  }
}

export async function listSessions(
  userId: string,
  options?: { limit?: number; cursor?: RunashSessionListCursor | null; query?: string },
): Promise<RunashSession[]> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage()) {
    const sessions = await repositoryAdapters.listChatSessions(normalizedUserId, options)
    return sessions.map(mapSession)
  }

  const sessions = readJsonFile<RunashSession[]>(SESSIONS_FILE, []).filter((session) => !session.deleted_at)
  const query = options?.query?.trim().toLowerCase()
  const filteredByQuery = query ? sessions.filter((session) => session.title.toLowerCase().includes(query)) : sessions
  const ordered = filteredByQuery.sort((a, b) => {
    const byUpdated = String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? ""))
    if (byUpdated !== 0) return byUpdated
    return String(b.id).localeCompare(String(a.id))
  })

  if (options?.cursor?.updatedAt && options?.cursor?.id) {
    const cursorUpdatedAt = String(options.cursor.updatedAt)
    const cursorId = String(options.cursor.id)
    const cursorFiltered = ordered.filter((session) => {
      if (String(session.updated_at) < cursorUpdatedAt) return true
      if (String(session.updated_at) > cursorUpdatedAt) return false
      return String(session.id) < cursorId
    })
    return typeof options?.limit === "number" && options.limit > 0 ? cursorFiltered.slice(0, options.limit) : cursorFiltered
  }

  return typeof options?.limit === "number" && options.limit > 0 ? ordered.slice(0, options.limit) : ordered
}

export async function createSession(title = "Session", userId: string): Promise<RunashSession> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage()) {
    const session = await repositoryAdapters.createChatSession(normalizedUserId, title)
    return mapSession(session)
  }

  const sessions = await listSessions(normalizedUserId)
  const nowIso = new Date().toISOString()
  const newSession: RunashSession = {
    id: `s-${Date.now()}`,
    title,
    created_at: nowIso,
    updated_at: nowIso,
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

  if (useDatabaseBackedChatStorage()) {
    const session = await repositoryAdapters.updateChatSessionState(normalizedUserId, sessionId, updates)
    return session ? mapSession(session) : null
  }

  const sessions = readJsonFile<RunashSession[]>(SESSIONS_FILE, [])
  const matchIndex = sessions.findIndex((session) => String(session.id) === String(sessionId) && !session.deleted_at)
  if (matchIndex < 0) return null

  sessions[matchIndex] = {
    ...sessions[matchIndex],
    ...(updates.title ? { title: updates.title } : {}),
    ...(typeof updates.archived === "boolean" ? { archived_at: updates.archived ? new Date().toISOString() : null } : {}),
    updated_at: new Date().toISOString(),
  }

  writeJsonFile(SESSIONS_FILE, sessions)
  return sessions[matchIndex]
}

export async function softDeleteSession(sessionId: string, userId: string): Promise<boolean> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage()) {
    return repositoryAdapters.softDeleteChatSession(normalizedUserId, sessionId)
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

  if (useDatabaseBackedChatStorage()) {
    const session = await repositoryAdapters.getMostRecentChatSession(normalizedUserId)
    return session ? mapSession(session) : null
  }

  const sessions = await listSessions(normalizedUserId)
  return sessions[0] ?? null
}

export async function listSessionMessages(
  sessionId: string,
  limit: number | undefined,
  userId: string,
  cursor?: RunashSessionMessageListCursor | null,
): Promise<RunashSessionMessage[]> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage()) {
    const ownerSession = await repositoryAdapters.getChatSessionById(normalizedUserId, String(sessionId))
    if (!ownerSession) {
      throw new Error("SESSION_ACCESS_DENIED")
    }

    return repositoryAdapters.listMessagesBySession(String(sessionId), limit, cursor)
  }

  const isOwned = await isSessionOwnedByUser(sessionId, normalizedUserId)
  if (!isOwned) {
    throw new Error("SESSION_ACCESS_DENIED")
  }

  const messages = readJsonFile<RunashSessionMessage[]>(MESSAGES_FILE, [])
  const normalizedSessionId = String(sessionId)

  const filtered = messages
    .filter((message) => String(message.session_id) === normalizedSessionId && !message.deleted_at)
    .sort((a, b) => {
      const byCreated = String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""))
      if (byCreated !== 0) return byCreated
      return String(a.id).localeCompare(String(b.id))
    })

  const cursorCreatedAt = cursor?.createdAt ? String(cursor.createdAt) : null
  const cursorId = cursor?.id ? String(cursor.id) : null
  const cursorFiltered = cursorCreatedAt && cursorId
    ? filtered.filter((message) => {
        const createdAt = String(message.created_at ?? "")
        if (createdAt > cursorCreatedAt) return true
        if (createdAt < cursorCreatedAt) return false
        return String(message.id) > cursorId
      })
    : filtered

  if (!limit || limit < 1) return cursorFiltered
  return cursorFiltered.slice(0, limit)
}

export async function isSessionOwnedByUser(sessionId: string, userId: string): Promise<boolean> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage()) {
    const session = await repositoryAdapters.getChatSessionById(normalizedUserId, String(sessionId))
    return Boolean(session)
  }

  const sessions = await listSessions(normalizedUserId)
  return sessions.some((session) => String(session.id) === String(sessionId))
}

export async function getMessageByIdForUser(messageId: string | number, userId: string): Promise<RunashSessionMessage | null> {
  const normalizedUserId = requireUserId(userId)

  if (useDatabaseBackedChatStorage()) {
    return repositoryAdapters.getMessageByIdForUser(messageId, normalizedUserId)
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

  if (useDatabaseBackedChatStorage()) {
    const ownerSession = await repositoryAdapters.getChatSessionById(normalizedUserId, String(sessionId))
    if (!ownerSession) {
      throw new Error("SESSION_ACCESS_DENIED")
    }

    return repositoryAdapters.updateChatSessionMessage(sessionId, messageId, content, normalizedUserId)
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

  if (useDatabaseBackedChatStorage()) {
    const ownerSession = await repositoryAdapters.getChatSessionById(normalizedUserId, String(sessionId))
    if (!ownerSession) {
      throw new Error("SESSION_ACCESS_DENIED")
    }

    return repositoryAdapters.deleteChatSessionMessage(sessionId, messageId, normalizedUserId)
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

  if (useDatabaseBackedChatStorage()) {
    const ownerSession = await repositoryAdapters.getChatSessionById(normalizedUserId, String(sessionId))
    if (!ownerSession) {
      throw new Error("SESSION_ACCESS_DENIED")
    }

    return repositoryAdapters.createChatSessionMessage(sessionId, role, content, messageType)
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

  messages.push(newMessage)
  writeJsonFile(MESSAGES_FILE, messages)

  return newMessage
}
