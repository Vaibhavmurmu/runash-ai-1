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
  } | null
}

test("resolveSessionFromSources returns active primary session", async () => {
  const now = Date.now()
  const session: SessionFixture = {
    session: { id: "sess_1", createdAt: new Date(now - 1_000), updatedAt: new Date(now - 1_000) },
    user: { id: "u_1" },
  }
  const metrics: string[] = []

  const result = await resolveSessionFromSources({
    getPrimarySession: async () => session,
    getLegacySession: async () => null,
    isLegacyFallbackEnabled: async () => true,
    recordMetric: (name) => metrics.push(name),
    now: () => now,
  })

  assert.equal(result?.session.id, "sess_1")
  assert.deepEqual(metrics, [])
})

test("resolveSessionFromSources records unavailable metric when fallback is disabled", async () => {
  const metrics: string[] = []

  const result = await resolveSessionFromSources({
    getPrimarySession: async () => null,
    getLegacySession: async () => ({ session: { id: "legacy", createdAt: new Date(), updatedAt: new Date() }, user: { id: "u" } }),
    isLegacyFallbackEnabled: async () => false,
    recordMetric: (name) => metrics.push(name),
    now: () => Date.now(),
  })

  assert.equal(result, null)
  assert.deepEqual(metrics, ["auth.legacy_fallback.unavailable"])
})

test("resolveSessionFromSources falls back to legacy session and records usage metric", async () => {
  const metrics: string[] = []

  const result = await resolveSessionFromSources({
    getPrimarySession: async () => null,
    getLegacySession: async () => ({ session: { id: "legacy_1", createdAt: new Date(), updatedAt: new Date() }, user: { id: "u_legacy" } }),
    isLegacyFallbackEnabled: async () => true,
    recordMetric: (name) => metrics.push(name),
    now: () => Date.now(),
  })

  assert.equal(result?.session.id, "legacy_1")
  assert.deepEqual(metrics, ["auth.legacy_fallback.used"])
})

test("resolveSessionFromSources invalidates expired primary sessions", async () => {
  const now = Date.now()
  const tags: Record<string, string>[] = []

  const result = await resolveSessionFromSources({
    getPrimarySession: async () => ({
      session: { id: "expired", createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000), updatedAt: new Date(now - 1_000) },
      user: { id: "u_expired" },
    }),
    getLegacySession: async () => null,
    isLegacyFallbackEnabled: async () => true,
    recordMetric: (_name, metricTags) => metricTags && tags.push(metricTags),
    now: () => now,
  })

  assert.equal(result, null)
  assert.equal(tags[0]?.reason, "absolute_expiry")
})
