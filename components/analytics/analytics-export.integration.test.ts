import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = process.cwd()
const source = readFileSync(path.join(repoRoot, "components/analytics/analytics-export.tsx"), "utf8")

test("analytics export supports success state with canonical rows contract", () => {
  assert.match(source, /fetchState === "success"/)
  assert.match(source, /Export dataset ready/)
  assert.match(source, /"rows" in data && Array\.isArray\(data\.rows\)/)
})

test("analytics export keeps explicit empty dataset state", () => {
  assert.match(source, /setFetchState\(rows\.length \? "success" : "empty"\)/)
  assert.match(source, /No analytics data found for current filters\./)
})

test("analytics export shows API failure state, retry action, and export-failure telemetry", () => {
  assert.match(source, /setFetchState\("error"\)/)
  assert.match(source, /Unable to load analytics for export:/)
  assert.match(source, />\s*Retry\s*</)
  assert.match(source, /analytics_export_failure/)
  assert.match(source, /\/api\/analytics\/export-failure/)
  assert.doesNotMatch(source, /generateMockData/)
})
