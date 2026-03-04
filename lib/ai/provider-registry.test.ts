import assert from "node:assert/strict"
import test from "node:test"

import { AIProviderError, listModelCatalog, resolveModelSelection } from "./provider-registry"

test("model catalog includes custom profiles", () => {
  const catalog = listModelCatalog()
  const ids = catalog.map((entry) => entry.id)

  assert.ok(ids.includes("custom-v0"))
  assert.ok(ids.includes("custom-v0-mini"))
})

test("resolveModelSelection defaults to openai gpt-4o-mini", () => {
  const selection = resolveModelSelection()

  assert.equal(selection.provider, "openai")
  assert.equal(selection.model, "gpt-4o-mini")
})

test("resolveModelSelection rejects mismatched provider/model", () => {
  assert.throws(
    () => resolveModelSelection("gpt-4o-mini", "ollama"),
    (error) => error instanceof AIProviderError && error.code === "BAD_REQUEST",
  )
})
