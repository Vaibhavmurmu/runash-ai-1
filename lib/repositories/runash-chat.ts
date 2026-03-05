import fs from "fs"
import path from "path"

import {
  createChatSession,
  getChatSessionById,
  getMostRecentChatSession,
  listChatSessions,
  type ChatSession,
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

export type RunashSession = Pick<ChatSession, "id" | "title" | "created_at">

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
  }
}

export async function listSessions(userId?: string): Promise<RunashSession[]> {
  if (useDatabaseBackedChatStorage) {
    const sessions = await listChatSessions(requireUserId(userId))
    return sessions.map(mapSession)
  }

  return readJsonFile<RunashSession[]>(SESSIONS_FILE, [])
}

export async function createSession(title = "Session", userId?: string): Promise<RunashSession> {
  if (useDatabaseBackedChatStorage) {
    const session = await createChatSession(requireUserId(userId), title)
    return mapSession(session)
  }

  const sessions = await listSessions()
  const newSession: RunashSession = {
    id: `s-${Date.now()}`,
    title,
    created_at: new Date().toISOString(),
  }

  sessions.unshift(newSession)
  writeJsonFile(SESSIONS_FILE, sessions)

  return newSession
}

export async function getMostRecentSession(userId?: string): Promise<RunashSession | null> {
  if (useDatabaseBackedChatStorage) {
    const session = await getMostRecentChatSession(requireUserId(userId))
    return session ? mapSession(session) : null
  }

  const sessions = await listSessions()
  return sessions[0] ?? null
}

export async function listSessionMessages(sessionId: string, limit?: number): Promise<RunashSessionMessage[]> {
  if (useDatabaseBackedChatStorage) {
    return listMessagesBySession(String(sessionId), limit)
  }

  const messages = readJsonFile<RunashSessionMessage[]>(MESSAGES_FILE, [])
  const normalizedSessionId = String(sessionId)

  const filtered = messages
    .filter((message) => String(message.session_id) === normalizedSessionId)
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      return bTime - aTime
    })

  if (!limit || limit < 1) return filtered
  return filtered.slice(0, limit)
}

export async function isSessionOwnedByUser(sessionId: string, userId?: string): Promise<boolean> {
  if (useDatabaseBackedChatStorage) {
    const session = await getChatSessionById(requireUserId(userId), String(sessionId))
    return Boolean(session)
  }

  return true
}


export async function updateSessionMessage(
  sessionId: string,
  messageId: string | number,
  content: string,
): Promise<RunashSessionMessage | null> {
  if (useDatabaseBackedChatStorage) {
    return updateChatSessionMessage(sessionId, messageId, content)
  }

  const messages = readJsonFile<RunashSessionMessage[]>(MESSAGES_FILE, [])
  const normalizedSessionId = String(sessionId)
  const normalizedMessageId = String(messageId)
  const matchIndex = messages.findIndex(
    (message) => String(message.session_id) === normalizedSessionId && String(message.id) === normalizedMessageId,
  )

  if (matchIndex < 0) {
    return null
  }

  const updatedMessage: RunashSessionMessage = {
    ...messages[matchIndex],
    content,
  }

  messages[matchIndex] = updatedMessage
  writeJsonFile(MESSAGES_FILE, messages)

  return updatedMessage
}

export async function deleteSessionMessage(sessionId: string, messageId: string | number): Promise<boolean> {
  if (useDatabaseBackedChatStorage) {
    return deleteChatSessionMessage(sessionId, messageId)
  }

  const messages = readJsonFile<RunashSessionMessage[]>(MESSAGES_FILE, [])
  const normalizedSessionId = String(sessionId)
  const normalizedMessageId = String(messageId)
  const retained = messages.filter(
    (message) => !(String(message.session_id) === normalizedSessionId && String(message.id) === normalizedMessageId),
  )

  if (retained.length === messages.length) {
    return false
  }

  writeJsonFile(MESSAGES_FILE, retained)
  return true
}
export async function createSessionMessage(
  sessionId: string,
  role: RunashSessionMessage["role"],
  content: string,
  messageType: RunashSessionMessage["message_type"] = "text",
): Promise<RunashSessionMessage> {
  if (useDatabaseBackedChatStorage) {
    return createChatSessionMessage(sessionId, role, content, messageType)
  }

  const messages = readJsonFile<RunashSessionMessage[]>(MESSAGES_FILE, [])
  const newMessage: RunashSessionMessage = {
    id: Date.now(),
    session_id: String(sessionId),
    role,
    content,
    created_at: new Date().toISOString(),
    message_type: messageType,
  }

  messages.unshift(newMessage)
  writeJsonFile(MESSAGES_FILE, messages)

  return newMessage
}
