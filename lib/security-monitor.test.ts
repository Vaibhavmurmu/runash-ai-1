import assert from "node:assert/strict"
import test from "node:test"

import { aggregateGeographicThreats } from "@/lib/security-monitor"

test("aggregateGeographicThreats parses counts and risk scores", () => {
  const result = aggregateGeographicThreats([
    { country: "India", threats: "5", risk_score: "8.75" },
    { country: "", threats: 2, risk_score: 3.5 },
  ])

  assert.deepEqual(result, [
    { country: "India", threats: 5, risk_score: 8.75 },
    { country: "Unknown", threats: 2, risk_score: 3.5 },
  ])
})

test("aggregateGeographicThreats returns empty list for empty dataset", () => {
  assert.deepEqual(aggregateGeographicThreats([]), [])
})
