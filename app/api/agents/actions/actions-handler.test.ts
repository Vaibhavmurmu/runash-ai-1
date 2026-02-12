import assert from "node:assert/strict"
import test from "node:test"

import { resolveActionDecision } from "./actions-handler.ts"

test("high-risk action without confirmation is rejected", () => {
  const result = resolveActionDecision({ requiresConfirmation: true, confirmedByUser: false })
  assert.equal(result.status, "rejected")
})

test("confirmed high-risk action is approved", () => {
  const result = resolveActionDecision({ requiresConfirmation: true, confirmedByUser: true })
  assert.equal(result.status, "approved")
})
