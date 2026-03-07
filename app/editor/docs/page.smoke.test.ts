import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("editor docs page exports metadata and key onboarding sections", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8")

  assert.match(source, /export\s+const\s+metadata\s*:\s*Metadata/)
  assert.match(source, /Editor Guide: Features, Quick Start, and Step-by-Step Workflow/)
  assert.match(source, /1\) What the editor does/)
  assert.match(source, /8\) FAQ \/ common errors/)
})
