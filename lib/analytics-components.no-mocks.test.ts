import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const engagementPath = "components/analytics/engagement-metrics.tsx"
const contentPath = "components/analytics/content-analytics.tsx"

test("engagement metrics does not use fabricated random/mock constants", async () => {
  const source = await readFile(engagementPath, "utf8")

  assert.ok(!source.includes("Math.random"), "engagement metrics should not use Math.random")
  assert.ok(!source.includes("Array.from({ length: 30 }"), "engagement metrics should not generate deterministic local series")
  assert.ok(source.includes("getHistoricalAnalytics"), "engagement metrics should fetch historical analytics")
  assert.ok(source.includes("Loading engagement analytics"), "engagement metrics should render loading state")
  assert.ok(source.includes("Unable to load engagement analytics"), "engagement metrics should render error state")
})

test("content analytics does not use hardcoded content dataset placeholders", async () => {
  const source = await readFile(contentPath, "utf8")

  assert.ok(!source.includes("/placeholder.svg"), "content analytics should not use placeholder thumbnails")
  assert.ok(!source.includes("const contentData: ContentPerformance"), "content analytics should not use hardcoded contentData")
  assert.ok(source.includes("getContentAnalytics"), "content analytics should fetch API-backed content analytics")
  assert.ok(source.includes("Loading content analytics"), "content analytics should render loading state")
  assert.ok(source.includes("Unable to load content analytics"), "content analytics should render error state")
})
