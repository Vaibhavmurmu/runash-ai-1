import assert from "node:assert/strict"
import test from "node:test"

import { isSegmentLockActive } from "@/lib/editor/segment-locks"
import { claimProjectVersion } from "@/lib/editor/versioned-mutations"

test("stale writes return 409 with latest snapshot payload", async () => {
  const sqlClient = async () => []
  const latest = { id: "project-1", version: 12, timelines: [] }

  const result = await claimProjectVersion(
    {
      projectId: "project-1",
      userId: "user-1",
      expectedVersion: 11,
      mutation: "segment.update",
      targetType: "segment",
      targetId: "segment-1",
    },
    {
      sqlClient: sqlClient as any,
      getProject: async () => latest as any,
      publishConflict: () => undefined,
    },
  )

  assert.equal(result.ok, false)
  const response = (result as any).response
  assert.equal(response.status, 409)
  const body = await response.json()
  assert.equal(body.latest.version, 12)
  assert.equal(body.conflict.expectedVersion, 11)
  assert.equal(body.conflict.actualVersion, 12)
})

test("segment lock expires when expiry timestamp is in the past", () => {
  const now = Date.UTC(2026, 0, 1, 0, 0, 0)
  const expired = new Date(now - 1_000).toISOString()
  const active = new Date(now + 30_000).toISOString()

  assert.equal(isSegmentLockActive("user-2", expired, now), false)
  assert.equal(isSegmentLockActive("user-2", active, now), true)
  assert.equal(isSegmentLockActive(null, active, now), false)
})
