import assert from "node:assert/strict"
import test from "node:test"

import { executeVideoModelById, resolveVideoModelProviderAdapter } from "@/lib/editor/video-models/registry"
import { mapVideoModelExecutionError } from "@/lib/editor/video-models/validation"

test("resolveVideoModelProviderAdapter returns adapter for known model", () => {
  const adapter = resolveVideoModelProviderAdapter("runway-gen3")

  assert.ok(adapter)
  assert.equal(adapter?.provider, "runway")
})

test("executeVideoModelById executes by payload modelId", async () => {
  const execution = await executeVideoModelById({ modelId: "wan-2.1", prompt: "test prompt" })

  assert.ok(execution)
  assert.equal(execution?.providerRequest.modelId, "wan-2.1")
  assert.equal(execution?.progress.provider, "wan")
})

test("mapVideoModelExecutionError redacts sensitive provider tokens", () => {
  const mapped = mapVideoModelExecutionError(new Error("provider failed with sk_live_abc123456789 and apiKey=supersecret"))

  assert.equal(mapped.code, "VIDEO_MODEL_EXECUTION_FAILED")
  assert.ok(!mapped.message.includes("sk_live_abc123456789"))
  assert.ok(!mapped.message.includes("apiKey=supersecret"))
})
