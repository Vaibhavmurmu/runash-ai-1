import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  createSession,
  listSessionMessages,
  listSessions,
  type RunashChatRepositoryAdapters,
  setRunashChatRepositoryAdaptersForTests,
  softDeleteSession,
  updateSession,
  type RunashSession,
} from "@/lib/repositories/runash-chat"

type SessionMessage = {
  id: number
  session_id: string
  role: "assistant" | "user"
  content: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  message_type: "text"
}

type SessionStore = {
  sessions: Array<{
    id: string
    user_id: string
    title: string
    created_at: string
    updated_at: string
    archived_at: string | null
    deleted_at: string | null
  }>
  messages: SessionMessage[]
}

function makeDbAdapters(store: SessionStore): RunashChatRepositoryAdapters {
  const nowIso = () => new Date().toISOString()

  return {
    async listChatSessions(userId: string, options?: number | { limit?: number; cursor?: { updatedAt: string; id: string } | null; query?: string }) {
      const resolvedOptions = typeof options === "number" ? { limit: options } : options ?? {}
      const query = resolvedOptions.query?.trim().toLowerCase()

      const filteredByUser = store.sessions.filter((session) => session.user_id === userId && !session.deleted_at)
      const filteredByQuery = query ? filteredByUser.filter((session) => session.title.toLowerCase().includes(query)) : filteredByUser
      const ordered = filteredByQuery.sort((a, b) => {
        const byUpdated = String(b.updated_at).localeCompare(String(a.updated_at))
        if (byUpdated !== 0) return byUpdated
        return String(b.id).localeCompare(String(a.id))
      })

      const cursorFiltered = resolvedOptions.cursor
        ? ordered.filter((session) => {
            if (String(session.updated_at) < String(resolvedOptions.cursor?.updatedAt)) return true
            if (String(session.updated_at) > String(resolvedOptions.cursor?.updatedAt)) return false
            return String(session.id) < String(resolvedOptions.cursor?.id)
          })
        : ordered

      if (resolvedOptions.limit && resolvedOptions.limit > 0) {
        return cursorFiltered.slice(0, resolvedOptions.limit)
      }

      return cursorFiltered
    },
    async createChatSession(userId: string, title: string) {
      const now = nowIso()
      const created = {
        id: `db-${store.sessions.length + 1}`,
        user_id: userId,
        title,
        created_at: now,
        updated_at: now,
        archived_at: null,
        deleted_at: null,
      }

      store.sessions.unshift(created)
      return created
    },
    async updateChatSessionState(userId: string, sessionId: string, updates: { title?: string; archived?: boolean }) {
      const match = store.sessions.find((session) => session.user_id === userId && session.id === sessionId && !session.deleted_at)
      if (!match) return null

      if (updates.title) match.title = updates.title
      if (typeof updates.archived === "boolean") {
        match.archived_at = updates.archived ? nowIso() : null
      }
      match.updated_at = nowIso()
      return match
    },
    async softDeleteChatSession(userId: string, sessionId: string) {
      const match = store.sessions.find((session) => session.user_id === userId && session.id === sessionId && !session.deleted_at)
      if (!match) return false

      match.deleted_at = nowIso()
      match.updated_at = nowIso()
      return true
    },
    async getMostRecentChatSession(userId: string) {
      return (
        store.sessions
          .filter((session) => session.user_id === userId && !session.deleted_at)
          .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0] ?? null
      )
    },
    async getChatSessionById(userId: string, sessionId: string) {
      return store.sessions.find((session) => session.user_id === userId && session.id === sessionId && !session.deleted_at) ?? null
    },
    async listMessagesBySession(sessionId: string, limit?: number, cursor?: { createdAt: string; id: string } | null) {
      const ordered = store.messages
        .filter((message) => message.session_id === sessionId && !message.deleted_at)
        .sort((a, b) => {
          const byCreated = String(a.created_at).localeCompare(String(b.created_at))
          if (byCreated !== 0) return byCreated
          return Number(a.id) - Number(b.id)
        })

      const cursorFiltered = cursor
        ? ordered.filter((message) => {
            if (String(message.created_at) > String(cursor.createdAt)) return true
            if (String(message.created_at) < String(cursor.createdAt)) return false
            return Number(message.id) > Number(cursor.id)
          })
        : ordered

      if (limit && limit > 0) {
        return cursorFiltered.slice(0, limit)
      }

      return cursorFiltered
    },
    async createChatSessionMessage(sessionId: string, role: "assistant" | "user", content: string) {
      const created = {
        id: store.messages.length + 1,
        session_id: sessionId,
        role,
        content,
        created_at: nowIso(),
        updated_at: nowIso(),
        deleted_at: null,
        message_type: "text" as const,
      }
      store.messages.push(created)
      return created
    },
    async updateChatSessionMessage() {
      throw new Error("NOT_USED")
    },
    async deleteChatSessionMessage() {
      throw new Error("NOT_USED")
    },
    async getMessageByIdForUser() {
      return null
    },
  }
}

function sessionShape(session: RunashSession) {
  return Object.keys(session).sort()
}

test("runash chat repository uses DB path by default and keeps CRUD response shape parity with local-dev fallback", async () => {
  const previousCwd = process.cwd()
  const previousNodeEnv = process.env.NODE_ENV
  const previousFlag = process.env.RUNASH_CHAT_LOCAL_DEV_FILE_STORAGE

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "runash-chat-repo-"))
  process.chdir(tempDir)

  try {
    process.env.NODE_ENV = "test"
    delete process.env.RUNASH_CHAT_LOCAL_DEV_FILE_STORAGE

    const dbStore: SessionStore = { sessions: [], messages: [] }
    setRunashChatRepositoryAdaptersForTests(makeDbAdapters(dbStore))

    const dbCreated = await createSession("DB Session", "user-db")
    const dbListed = await listSessions("user-db")
    const dbUpdated = await updateSession(dbCreated.id, { title: "DB Updated", archived: true }, "user-db")
    const dbDeleted = await softDeleteSession(dbCreated.id, "user-db")
    const dbAfterDelete = await listSessions("user-db")

    assert.equal(dbListed.length, 1)
    assert.equal(dbUpdated?.title, "DB Updated")
    assert.equal(typeof dbUpdated?.archived_at, "string")
    assert.equal(dbDeleted, true)
    assert.equal(dbAfterDelete.length, 0)

    process.env.RUNASH_CHAT_LOCAL_DEV_FILE_STORAGE = "true"
    const localCreated = await createSession("Local Session", "user-local")
    const localListed = await listSessions("user-local")
    const localUpdated = await updateSession(localCreated.id, { title: "Local Updated", archived: true }, "user-local")
    const localDeleted = await softDeleteSession(localCreated.id, "user-local")
    const localAfterDelete = await listSessions("user-local")

    assert.equal(localListed.length, 1)
    assert.equal(localUpdated?.title, "Local Updated")
    assert.equal(typeof localUpdated?.archived_at, "string")
    assert.equal(localDeleted, true)
    assert.equal(localAfterDelete.length, 0)

    assert.deepEqual(sessionShape(dbCreated), sessionShape(localCreated))
    assert.deepEqual(sessionShape(dbUpdated as RunashSession), sessionShape(localUpdated as RunashSession))
  } finally {
    setRunashChatRepositoryAdaptersForTests(null)

    if (previousFlag === undefined) {
      delete process.env.RUNASH_CHAT_LOCAL_DEV_FILE_STORAGE
    } else {
      process.env.RUNASH_CHAT_LOCAL_DEV_FILE_STORAGE = previousFlag
    }

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = previousNodeEnv
    }

    process.chdir(previousCwd)
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})


test("runash chat repository pagination remains stable under concurrent inserts", async () => {
  const dbStore: SessionStore = {
    sessions: [
      { id: "s-4", user_id: "user-1", title: "delta", created_at: "2025-01-01T00:00:00.000Z", updated_at: "2025-01-04T00:00:00.000Z", archived_at: null, deleted_at: null },
      { id: "s-3", user_id: "user-1", title: "gamma", created_at: "2025-01-01T00:00:00.000Z", updated_at: "2025-01-03T00:00:00.000Z", archived_at: null, deleted_at: null },
      { id: "s-2", user_id: "user-1", title: "beta", created_at: "2025-01-01T00:00:00.000Z", updated_at: "2025-01-02T00:00:00.000Z", archived_at: null, deleted_at: null },
      { id: "s-1", user_id: "user-1", title: "alpha", created_at: "2025-01-01T00:00:00.000Z", updated_at: "2025-01-01T00:00:00.000Z", archived_at: null, deleted_at: null },
    ],
    messages: [
      { id: 1, session_id: "s-1", role: "user", content: "1", created_at: "2025-01-01T00:00:00.000Z", updated_at: "2025-01-01T00:00:00.000Z", deleted_at: null, message_type: "text" },
      { id: 2, session_id: "s-1", role: "assistant", content: "2", created_at: "2025-01-01T00:00:01.000Z", updated_at: "2025-01-01T00:00:01.000Z", deleted_at: null, message_type: "text" },
      { id: 3, session_id: "s-1", role: "user", content: "3", created_at: "2025-01-01T00:00:02.000Z", updated_at: "2025-01-01T00:00:02.000Z", deleted_at: null, message_type: "text" },
      { id: 4, session_id: "s-1", role: "assistant", content: "4", created_at: "2025-01-01T00:00:03.000Z", updated_at: "2025-01-01T00:00:03.000Z", deleted_at: null, message_type: "text" },
    ],
  }

  setRunashChatRepositoryAdaptersForTests(makeDbAdapters(dbStore))

  try {
    const firstSessionsPage = await listSessions("user-1", { limit: 2 })
    assert.deepEqual(firstSessionsPage.map((item) => item.id), ["s-4", "s-3"])

    dbStore.sessions.unshift({
      id: "s-5",
      user_id: "user-1",
      title: "new hot session",
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-05T00:00:00.000Z",
      archived_at: null,
      deleted_at: null,
    })

    const secondSessionsPage = await listSessions("user-1", {
      limit: 2,
      cursor: { updatedAt: String(firstSessionsPage[1].updated_at), id: firstSessionsPage[1].id },
    })
    assert.deepEqual(secondSessionsPage.map((item) => item.id), ["s-2", "s-1"])

    const firstMessagesPage = await listSessionMessages("s-1", 2, "user-1")
    assert.deepEqual(firstMessagesPage.map((item) => item.id), [1, 2])

    dbStore.messages.push({
      id: 10,
      session_id: "s-1",
      role: "assistant",
      content: "newest",
      created_at: "2025-01-01T00:00:05.000Z",
      updated_at: "2025-01-01T00:00:05.000Z",
      deleted_at: null,
      message_type: "text",
    })

    const secondMessagesPage = await listSessionMessages("s-1", 2, "user-1", {
      createdAt: String(firstMessagesPage[1].created_at),
      id: String(firstMessagesPage[1].id),
    })
    assert.deepEqual(secondMessagesPage.map((item) => item.id), [3, 4])
  } finally {
    setRunashChatRepositoryAdaptersForTests(null)
  }
})
