import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = process.cwd()
const source = readFileSync(path.join(repoRoot, "components/analytics/analytics-export.tsx"), "utf8")

test("analytics export exposes explicit error state with retry and cached snapshot support", () => {
  assert.match(source, /analytics-export-cache:/)
  assert.match(source, /Using last successful snapshot/)
  assert.match(source, /Retry/)
  assert.doesNotMatch(source, /mock/i)
})

test("analytics export keeps loading and empty states without synthetic fallback rows", () => {
  assert.match(source, /Loading analytics data for export…/)
  assert.match(source, /No analytics data found for current filters\./)
  assert.match(source, /setFetchState\("error"\)/)
})
