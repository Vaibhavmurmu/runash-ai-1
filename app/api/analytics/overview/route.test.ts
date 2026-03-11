import assert from "node:assert/strict"
import test from "node:test"

import { computePercentChange, getPeriodBounds } from "./change"

test("computePercentChange handles previous period zero", () => {
  assert.equal(computePercentChange(150, 0), 100)
  assert.equal(computePercentChange(0, 0), 0)
})

test("computePercentChange returns negative deltas", () => {
  assert.equal(computePercentChange(100, 200), -50)
})

test("computePercentChange handles no data as no change", () => {
  assert.equal(computePercentChange(0, 0), 0)
})

test("getPeriodBounds returns equivalent current and previous windows", () => {
  const now = new Date("2026-03-01T00:00:00.000Z")
  const { previousFrom, currentFrom, currentTo } = getPeriodBounds("7d", now)

  const currentDuration = currentTo.getTime() - currentFrom.getTime()
  const previousDuration = currentFrom.getTime() - previousFrom.getTime()

  assert.equal(currentDuration, previousDuration)
  assert.equal(currentDuration, 7 * 24 * 60 * 60 * 1000)
})
