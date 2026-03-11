import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = process.cwd()
const historicalSource = readFileSync(path.join(repoRoot, "app/api/analytics/historical/route.ts"), "utf8")
const sharedLibSource = readFileSync(path.join(repoRoot, "app/api/analytics/_lib.ts"), "utf8")

test("historical analytics route reuses shared period and stream validators", () => {
  assert.match(historicalSource, /parsePeriod\(searchParams\)/)
  assert.match(historicalSource, /parseOptionalStreamId\(searchParams\)/)
  assert.doesNotMatch(historicalSource, /Number\.parseInt\(streamId\)/)
})

test("shared streamId validator accepts UUID-like identifier format", () => {
  const streamIdRegex = /^[a-zA-Z0-9_-]{1,64}$/
  assert.equal(streamIdRegex.test("123e4567-e89b-12d3-a456-426614174000"), true)
})

test("shared streamId validator rejects invalid identifiers", () => {
  const streamIdRegex = /^[a-zA-Z0-9_-]{1,64}$/
  assert.equal(streamIdRegex.test("bad stream id!"), false)
})

test("shared period validator supports 24h/7d/30d/90d/1y and excludes legacy 1d", () => {
  assert.match(sharedLibSource, /const PERIOD_VALUES = \["24h", "7d", "30d", "90d", "1y"\] as const/)
  assert.doesNotMatch(sharedLibSource, /"1d"/)
})
