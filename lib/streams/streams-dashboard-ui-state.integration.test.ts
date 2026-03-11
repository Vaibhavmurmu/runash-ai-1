import assert from "node:assert/strict"
import test from "node:test"

import { resolveDashboardUiStatus } from "@/components/streams/streams-dashboard"

test("streams dashboard resolves loading/error/empty/ready states", () => {
  assert.equal(resolveDashboardUiStatus({ loading: true, error: null, itemCount: 0 }), "loading")
  assert.equal(resolveDashboardUiStatus({ loading: false, error: "boom", itemCount: 0 }), "error")
  assert.equal(resolveDashboardUiStatus({ loading: false, error: null, itemCount: 0 }), "empty")
  assert.equal(resolveDashboardUiStatus({ loading: false, error: null, itemCount: 2 }), "ready")
})
