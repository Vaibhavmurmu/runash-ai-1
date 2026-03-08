import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("editor docs page exports metadata and required sections", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8")

  assert.match(source, /export\s+const\s+metadata\s*:\s*Metadata/)
  assert.match(source, /Editor Documentation/)
  assert.match(source, /title: "Overview"/)
  assert.match(source, /title: "Prerequisites"/)
  assert.match(source, /title: "Quick start"/)
  assert.match(source, /title: "Timeline editing basics"/)
  assert.match(source, /title: "AI generation settings"/)
  assert.match(source, /title: "Collaboration and sharing workflow"/)
  assert.match(source, /title: "Export and troubleshooting"/)
  assert.match(source, /Expected result:/)
})
