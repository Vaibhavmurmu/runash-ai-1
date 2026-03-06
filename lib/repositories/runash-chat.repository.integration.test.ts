import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  createSession,
  listSessions,
  type RunashChatRepositoryAdapters,
  setRunashChatRepositoryAdaptersForTests,
  softDeleteSession,
  updateSession,
  type RunashSession,
} from "@/lib/repositories/runash-chat"

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
}

function makeDbAdapters(store: SessionStore): RunashChatRepositoryAdapters {
  const nowIso = () => new Date().toISOString()

  return {
    async listChatSessions(userId: string) {
      return store.sessions
        .filter((session) => session.user_id === userId && !session.deleted_at)
        .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
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
    async listMessagesBySession() {
      return []
    },
    async createChatSessionMessage() {
      throw new Error("NOT_USED")
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

    const dbStore: SessionStore = { sessions: [] }
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
