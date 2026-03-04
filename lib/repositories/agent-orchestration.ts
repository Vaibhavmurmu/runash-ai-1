import fs from "fs"
import path from "path"

export type AgentMessageStatus = "queued" | "streaming" | "tool-running" | "completed" | "failed"

export type AgentSessionState = "active" | "waiting_action" | "completed" | "failed"

export type AgentToolCall = {
  id: string
  session_id: string
  message_id: string
  tool_name: string
  input: Record<string, unknown>
  status: "started" | "completed" | "failed"
  created_at: string
  completed_at?: string
}

export type AgentToolResult = {
  id: string
  tool_call_id: string
  result: Record<string, unknown>
  created_at: string
}

export type AgentActionAudit = {
  id: string
  session_id: string
  action_type: string
  action_payload: Record<string, unknown>
  requires_confirmation: boolean
  confirmed_by_user: boolean
  status: "approved" | "rejected" | "executed" | "failed"
  created_at: string
}

export type AgentFeedback = {
  id: string
  session_id: string
  message_id?: string
  signal: "quality" | "safety"
  score: number
  reason?: string
  created_at: string
}

export type AgentSessionRecord = {
  id: string
  user_id: string
  title: string
  state: AgentSessionState
  created_at: string
  updated_at: string
}

export type AgentMessageRecord = {
  id: string
  session_id: string
  role: "assistant" | "user"
  content: string
  status: AgentMessageStatus
  client_request_id?: string
  created_at: string
  updated_at: string
}

export type AgentAttachmentRecord = {
  id: string
  session_id: string
  message_id: string
  name: string
  type: string
  size: number
  url?: string
  checksum?: string
  created_at: string
}

const DATA_DIR = path.join(process.cwd(), "data")
const AGENT_STORE_FILE = path.join(DATA_DIR, "agent-store.json")
const DEFAULT_RETENTION_DAYS = Number(process.env.RUNASH_AGENT_RETENTION_DAYS ?? "30")

type AgentStore = {
  sessions: AgentSessionRecord[]
  messages: AgentMessageRecord[]
  tool_calls: AgentToolCall[]
  tool_results: AgentToolResult[]
  actions: AgentActionAudit[]
  feedback: AgentFeedback[]
  attachments: AgentAttachmentRecord[]
}

const EMPTY_STORE: AgentStore = {
  sessions: [],
  messages: [],
  tool_calls: [],
  tool_results: [],
  actions: [],
  feedback: [],
  attachments: [],
}

function ensureStoreFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR)
  if (!fs.existsSync(AGENT_STORE_FILE)) fs.writeFileSync(AGENT_STORE_FILE, JSON.stringify(EMPTY_STORE, null, 2))
}

function readStore(): AgentStore {
  ensureStoreFile()

  try {
    const raw = fs.readFileSync(AGENT_STORE_FILE, "utf-8")
    const parsed = JSON.parse(raw) as AgentStore
    return {
      ...EMPTY_STORE,
      ...parsed,
      sessions: parsed.sessions ?? [],
      messages: parsed.messages ?? [],
      tool_calls: parsed.tool_calls ?? [],
      tool_results: parsed.tool_results ?? [],
      actions: parsed.actions ?? [],
      feedback: parsed.feedback ?? [],
      attachments: (parsed as any).attachments ?? [],
    }
  } catch {
    return { ...EMPTY_STORE }
  }
}

function writeStore(store: AgentStore) {
  ensureStoreFile()
  fs.writeFileSync(AGENT_STORE_FILE, JSON.stringify(store, null, 2))
}

function nowIso() {
  return new Date().toISOString()
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function redactSensitiveText(value: string) {
  return value
    .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s]+/gi, "$1=[REDACTED]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED_CARD]")
}

function minimizePayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (/(token|secret|password|card|cvv|expiry|authorization)/i.test(key)) {
        return [key, "[REDACTED]"]
      }

      if (typeof value === "string") {
        return [key, redactSensitiveText(value)]
      }

      return [key, value]
    }),
  )
}

export async function pruneExpiredAgentRecords() {
  const cutoffMs = Date.now() - DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000
  const store = readStore()

  store.messages = store.messages.filter((item) => new Date(item.created_at).getTime() >= cutoffMs)
  store.tool_calls = store.tool_calls.filter((item) => new Date(item.created_at).getTime() >= cutoffMs)
  store.tool_results = store.tool_results.filter((item) => new Date(item.created_at).getTime() >= cutoffMs)
  store.actions = store.actions.filter((item) => new Date(item.created_at).getTime() >= cutoffMs)
  store.feedback = store.feedback.filter((item) => new Date(item.created_at).getTime() >= cutoffMs)
  store.attachments = store.attachments.filter((item) => new Date(item.created_at).getTime() >= cutoffMs)

  writeStore(store)
}

export async function upsertAgentSession(userId: string, sessionId?: string, title = "Agent Session") {
  const store = readStore()
  const existing = sessionId ? store.sessions.find((session) => session.id === sessionId && session.user_id === userId) : undefined

  if (existing) {
    existing.updated_at = nowIso()
    writeStore(store)
    return existing
  }

  const newSession: AgentSessionRecord = {
    id: sessionId ?? makeId("as"),
    user_id: userId,
    title,
    state: "active",
    created_at: nowIso(),
    updated_at: nowIso(),
  }

  store.sessions.unshift(newSession)
  writeStore(store)
  return newSession
}

export async function createAgentMessage(
  sessionId: string,
  role: AgentMessageRecord["role"],
  content: string,
  status: AgentMessageStatus,
  options?: { clientRequestId?: string },
) {
  const store = readStore()
  const message: AgentMessageRecord = {
    id: makeId("am"),
    session_id: sessionId,
    role,
    content: redactSensitiveText(content),
    status,
    client_request_id: options?.clientRequestId,
    created_at: nowIso(),
    updated_at: nowIso(),
  }

  store.messages.push(message)
  writeStore(store)
  return message
}

export async function updateAgentMessage(messageId: string, updates: Partial<Pick<AgentMessageRecord, "status" | "content">>) {
  const store = readStore()
  const message = store.messages.find((entry) => entry.id === messageId)
  if (!message) return null

  if (typeof updates.status === "string") message.status = updates.status
  if (typeof updates.content === "string") message.content = redactSensitiveText(updates.content)
  message.updated_at = nowIso()

  writeStore(store)
  return message
}


export async function findAgentMessagesByClientRequestId(sessionId: string, clientRequestId: string) {
  const store = readStore()
  return store.messages.filter((entry) => entry.session_id === sessionId && entry.client_request_id === clientRequestId)
}

export async function createAgentMessageAttachments(input: {
  sessionId: string
  messageId: string
  attachments: Array<{ name: string; type: string; size: number; url?: string; checksum?: string }>
}) {
  const store = readStore()
  const created: AgentAttachmentRecord[] = []

  for (const attachment of input.attachments) {
    const record: AgentAttachmentRecord = {
      id: makeId("aaft"),
      session_id: input.sessionId,
      message_id: input.messageId,
      name: attachment.name,
      type: attachment.type,
      size: attachment.size,
      url: attachment.url,
      checksum: attachment.checksum,
      created_at: nowIso(),
    }
    store.attachments.push(record)
    created.push(record)
  }

  writeStore(store)
  return created
}

export async function createToolCallLineage(input: Omit<AgentToolCall, "id" | "created_at">) {
  const store = readStore()
  const record: AgentToolCall = {
    id: makeId("tc"),
    created_at: nowIso(),
    ...input,
    input: minimizePayload(input.input),
  }

  store.tool_calls.push(record)
  writeStore(store)

  return record
}

export async function completeToolCallLineage(toolCallId: string, status: AgentToolCall["status"]) {
  const store = readStore()
  const record = store.tool_calls.find((entry) => entry.id === toolCallId)
  if (!record) return null

  record.status = status
  record.completed_at = nowIso()
  writeStore(store)
  return record
}

export async function createToolResult(toolCallId: string, result: Record<string, unknown>) {
  const store = readStore()
  const record: AgentToolResult = {
    id: makeId("tr"),
    tool_call_id: toolCallId,
    result: minimizePayload(result),
    created_at: nowIso(),
  }

  store.tool_results.push(record)
  writeStore(store)
  return record
}

export async function createActionAuditRecord(input: Omit<AgentActionAudit, "id" | "created_at">) {
  const store = readStore()
  const record: AgentActionAudit = {
    id: makeId("aa"),
    created_at: nowIso(),
    ...input,
    action_payload: minimizePayload(input.action_payload),
  }

  store.actions.push(record)

  const session = store.sessions.find((entry) => entry.id === input.session_id)
  if (session) {
    session.state = input.requires_confirmation && !input.confirmed_by_user ? "waiting_action" : "active"
    session.updated_at = nowIso()
  }

  writeStore(store)
  return record
}

export async function createFeedbackRecord(input: Omit<AgentFeedback, "id" | "created_at">) {
  const store = readStore()
  const record: AgentFeedback = {
    id: makeId("fb"),
    created_at: nowIso(),
    ...input,
    reason: input.reason ? redactSensitiveText(input.reason) : undefined,
  }

  store.feedback.push(record)
  writeStore(store)
  return record
}

export async function getAgentSessionHistory(sessionId: string, userId: string, limit = 100, offset = 0) {
  const store = readStore()
  const session = store.sessions.find((entry) => entry.id === sessionId && entry.user_id === userId)
  if (!session) return null

  const allMessages = store.messages
    .filter((entry) => entry.session_id === sessionId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const messages = allMessages.slice(offset, offset + limit)

  const toolCalls = store.tool_calls
    .filter((entry) => entry.session_id === sessionId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const toolResults = store.tool_results.filter((entry) => toolCalls.some((call) => call.id === entry.tool_call_id))
  const actions = store.actions.filter((entry) => entry.session_id === sessionId)
  const feedback = store.feedback.filter((entry) => entry.session_id === sessionId)

  return {
    session,
    messages,
    tool_calls: toolCalls,
    tool_results: toolResults,
    actions,
    feedback,
    pagination: {
      total_messages: allMessages.length,
      limit,
      offset,
      has_more: offset + messages.length < allMessages.length,
      total_tool_calls: toolCalls.length,
    },
  }
}
