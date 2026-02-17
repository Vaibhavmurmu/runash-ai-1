import assert from "node:assert/strict"
import test from "node:test"

import { resolveSessionFromSources } from "./session-accessor-handler.ts"

type SessionFixture = {
  session: {
    id: string
    createdAt: Date
    updatedAt: Date
  }
  user: {
    id: string
  }
}

test("resolveSessionFromSources returns active primary session (signed-in state)", async () => {
  const now = Date.now()
  const session: SessionFixture = {
    session: {
      id: "sess_1",
      createdAt: new Date(now - 1_000),
      updatedAt: new Date(now - 1_000),
    },
    user: { id: "u_1" },
  }

  const metrics: string[] = []

  const result = await resolveSessionFromSources({
    getPrimarySession: async () => session,
    getLegacySession: async () => null,
    isBetterAuthEnabled: async () => true,
    recordMetric: (name) => metrics.push(name),
    now: () => now,
  })

  assert.equal(result?.session.id, "sess_1")
  assert.deepEqual(metrics, [])
})

test("resolveSessionFromSources returns null for signed-out state when better auth is enabled", async () => {
  const result = await resolveSessionFromSources({
    getPrimarySession: async () => null,
    getLegacySession: async () => ({
      session: { id: "legacy", createdAt: new Date(), updatedAt: new Date() },
      user: { id: "u_legacy" },
    }),
    isBetterAuthEnabled: async () => true,
    recordMetric: () => {},
    now: () => Date.now(),
  })

  assert.equal(result, null)
})

test("resolveSessionFromSources invalidates expired session and records metric", async () => {
  const now = Date.now()
  const tags: Record<string, string>[] = []

  const result = await resolveSessionFromSources({
    getPrimarySession: async () => ({
      session: {
        id: "expired",
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 1_000),
      },
      user: { id: "u_expired" },
    }),
    getLegacySession: async () => null,
    isBetterAuthEnabled: async () => true,
    recordMetric: (_name, metricTags) => {
      if (metricTags) {
        tags.push(metricTags)
      }
    },
    now: () => now,
  })

  assert.equal(result, null)
  assert.equal(tags[0]?.reason, "absolute_expiry")
})

test("resolveSessionFromSources invalidates inactive session and records inactivity expiry", async () => {
  const now = Date.now()
  const tags: Record<string, string>[] = []

  const result = await resolveSessionFromSources({
    getPrimarySession: async () => ({
      session: {
        id: "inactive",
        createdAt: new Date(now - 60_000),
        updatedAt: new Date(now - 2 * 60 * 60 * 1000),
      },
      user: { id: "u_inactive" },
    }),
    getLegacySession: async () => null,
    isBetterAuthEnabled: async () => true,
    recordMetric: (_name, metricTags) => {
      if (metricTags) {
        tags.push(metricTags)
      }
    },
    now: () => now,
  })

  assert.equal(result, null)
  assert.equal(tags[0]?.reason, "inactivity_expiry")
})

test("resolveSessionFromSources keeps active sessions without emitting lifecycle metrics", async () => {
  const now = Date.now()
  const metrics: Array<{ name: string; tags?: Record<string, string> }> = []

  const result = await resolveSessionFromSources({
    getPrimarySession: async () => ({
      session: {
        id: "active_session",
        createdAt: new Date(now - 10 * 60_000),
        updatedAt: new Date(now - 5 * 60_000),
      },
      user: { id: "u_active" },
    }),
    getLegacySession: async () => null,
    isBetterAuthEnabled: async () => true,
    recordMetric: (name, tags) => {
      metrics.push({ name, tags })
    },
    now: () => now,
  })

  assert.equal(result?.session.id, "active_session")
  assert.equal(metrics.length, 0)
})

test("resolveSessionFromSources falls back to legacy session when better auth flag is disabled", async () => {
  const legacySession: SessionFixture = {
    session: {
      id: "legacy_1",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    user: { id: "u_legacy" },
  }

  const result = await resolveSessionFromSources({
    getPrimarySession: async () => null,
    getLegacySession: async () => legacySession,
    isBetterAuthEnabled: async () => false,
    recordMetric: () => {},
    now: () => Date.now(),
  })

  assert.equal(result?.session.id, "legacy_1")
})
