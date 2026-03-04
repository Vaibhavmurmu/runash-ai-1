import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("ai editor page exports a default component and key hero copy", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8")

  assert.match(source, /export\s+default\s+function\s+AIEditorPage\s*\(/)
  assert.match(source, /Live Stream\./)
  assert.doesNotMatch(source, /\{\/\*\s*import Footer/)
})
