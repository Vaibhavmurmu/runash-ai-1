import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = process.cwd()
const source = readFileSync(path.join(repoRoot, "app/api/analytics/route.ts"), "utf8")

test("analytics route defines widget query contract for metric, period and dimensions", () => {
  assert.match(source, /parseWidgetQuery/)
  assert.match(source, /metric/) 
  assert.match(source, /period/) 
  assert.match(source, /dimensions/)
  assert.match(source, /viewer_count, streams, live_streams, avg_viewers/)
})

test("analytics route returns explicit widget series payload when metric query is provided", () => {
  assert.match(source, /mode: "widget"/)
  assert.match(source, /const payload: WidgetAnalyticsResponse/)
  assert.match(source, /series,/)
})
