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
