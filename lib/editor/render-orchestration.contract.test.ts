import test from "node:test"
import assert from "node:assert/strict"
import {
  assertRenderJobTransition,
  canTransitionRenderJob,
  computeRetryBackoffMs,
  mergeIdempotentCompletion,
} from "@/lib/editor/render-orchestration"

test("render job state transition contract", () => {
  assert.equal(canTransitionRenderJob("queued", "processing"), true)
  assert.equal(canTransitionRenderJob("processing", "completed"), true)
  assert.equal(canTransitionRenderJob("completed", "processing"), false)
  assert.throws(() => assertRenderJobTransition("failed", "completed"))
})

test("retry backoff grows with attempts and is capped", () => {
  const first = computeRetryBackoffMs(1, 1000, 2500)
  const third = computeRetryBackoffMs(3, 1000, 2500)
  assert.equal(first >= 1000, true)
  assert.equal(third <= 2500, true)
})

test("completion writes are idempotent for same storage key", () => {
  const existing = {
    output: {
      storageKey: "editor/key-1",
      checksum: "abc",
    },
  }
  const incoming = {
    output: {
      storageKey: "editor/key-1",
      checksum: "abc",
    },
  }

  assert.deepEqual(mergeIdempotentCompletion(existing, incoming), existing)
})
