import assert from "node:assert/strict"
import test from "node:test"

import { claimProjectVersion, parseExpectedVersion } from "@/lib/editor/versioned-mutations"

test("claimProjectVersion enforces optimistic concurrency for concurrent writes", async () => {
  let version = 5
  const conflicts: Array<{ expected: number; actual: number }> = []

  const sqlClient = async (_parts: TemplateStringsArray, ...values: unknown[]) => {
    const expected = Number(values[3])
    if (expected === version) {
      version += 1
      return [{ id: "project_1", version }]
    }
    return []
  }

  const getProject = async () => ({ version } as any)

  const first = await claimProjectVersion(
    {
      projectId: "project_1",
      userId: "user_1",
      expectedVersion: 5,
      mutation: "segment.update",
      targetType: "segment",
      targetId: "seg_1",
    },
    {
      sqlClient: sqlClient as any,
      getProject: getProject as any,
      publishConflict: (payload) => {
        conflicts.push({ expected: payload.expectedVersion, actual: payload.actualVersion })
      },
    },
  )

  const second = await claimProjectVersion(
    {
      projectId: "project_1",
      userId: "user_1",
      expectedVersion: 5,
      mutation: "segment.update",
      targetType: "segment",
      targetId: "seg_1",
    },
    {
      sqlClient: sqlClient as any,
      getProject: getProject as any,
      publishConflict: (payload) => {
        conflicts.push({ expected: payload.expectedVersion, actual: payload.actualVersion })
      },
    },
  )

  assert.equal(first.ok, true)
  assert.equal((first as any).projectVersion, 6)
  assert.equal(second.ok, false)
  const conflictResponse = (second as any).response
  assert.equal(conflictResponse.status, 409)
  const payload = await conflictResponse.json()
  assert.equal(payload.conflict.expectedVersion, 5)
  assert.equal(payload.conflict.actualVersion, 6)
  assert.deepEqual(conflicts, [{ expected: 5, actual: 6 }])
})

test("parseExpectedVersion returns 428 for stale-client writes without precondition", async () => {
  const request = new Request("http://localhost/api/editor/projects/p/timeline", { method: "POST" })
  const result = parseExpectedVersion(request, {})

  assert.equal("error" in result, true)
  if ("error" in result) {
    assert.equal(result.error.status, 428)
    const body = await result.error.json()
    assert.equal(body.code, "PRECONDITION_REQUIRED")
  }
})
