import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json")
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json")

export type RunashSession = {
  id: string
  title: string
  created_at: string
}

export type RunashSessionMessage = {
  id: string | number
  session_id: string
  role: "assistant" | "user"
  content: string
  created_at?: string
  message_type?: "text" | "product" | "recipe" | "tip" | "automation"
}

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

export function listSessions(): RunashSession[] {
  return readJsonFile<RunashSession[]>(SESSIONS_FILE, [])
}

export function createSession(title = "Session"): RunashSession {
  const sessions = listSessions()
  const newSession: RunashSession = {
    id: `s-${Date.now()}`,
    title,
    created_at: new Date().toISOString(),
  }

  sessions.unshift(newSession)
  writeJsonFile(SESSIONS_FILE, sessions)

  return newSession
}

export function getMostRecentSession(): RunashSession | null {
  const sessions = listSessions()
  return sessions[0] ?? null
}

export function listSessionMessages(sessionId: string, limit?: number): RunashSessionMessage[] {
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
