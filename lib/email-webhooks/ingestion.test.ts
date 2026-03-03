import assert from "node:assert/strict"
import test from "node:test"

import { mapEventToStructuredMetric } from "@/lib/email-webhooks/dispatch-metrics"

test("mapEventToStructuredMetric maps provider events to structured counters", () => {
  assert.equal(mapEventToStructuredMetric("delivered"), "delivered")
  assert.equal(mapEventToStructuredMetric("deferred"), "deferred")
  assert.equal(mapEventToStructuredMetric("bounced"), "bounced")
  assert.equal(mapEventToStructuredMetric("complaint"), "complained")
  assert.equal(mapEventToStructuredMetric("suppressed"), "suppressed")
  assert.equal(mapEventToStructuredMetric("clicked"), null)
})
