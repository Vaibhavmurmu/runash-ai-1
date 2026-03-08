import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = process.cwd()
const source = readFileSync(path.join(repoRoot, "components/ai-search.tsx"), "utf8")

test("ai search uses backend /api/search endpoint for suggestions and queries", () => {
  assert.match(source, /fetch\(`\/api\/search\?\$\{params\.toString\(\)\}`/)
  assert.doesNotMatch(source, /const streamResults = \[/)
  assert.doesNotMatch(source, /const recordingResults = \[/)
  assert.doesNotMatch(source, /const categoryResults = \[/)
  assert.doesNotMatch(source, /getProducts\(/)
})

test("ai search renders backend-driven loading, empty, and error states", () => {
  assert.match(source, /Searching…/)
  assert.match(source, /No results found\./)
  assert.match(source, /searchError/)
})
