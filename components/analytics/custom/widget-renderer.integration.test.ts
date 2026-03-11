import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = process.cwd()
const source = readFileSync(path.join(repoRoot, "components/analytics/custom/widget-renderer.tsx"), "utf8")

test("widget renderer consumes external analytics series and avoids mock constants", () => {
  assert.match(source, /series\?: WidgetAnalyticsPoint\[]/)
  assert.match(source, /LineChart data=\{series\}/)
  assert.match(source, /BarChart data=\{series\}/)
  assert.match(source, /data=\{series\}/)
  assert.doesNotMatch(source, /mock(Line|Bar|Pie)Data/)
})

test("widget renderer exposes explicit empty and fetch error states", () => {
  assert.match(source, /No analytics data available for current widget filters/)
  assert.match(source, /Unable to load analytics:/)
  assert.match(source, /isLoading/)
})
