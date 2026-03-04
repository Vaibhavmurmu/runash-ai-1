import assert from "node:assert/strict"
import test from "node:test"

import { evaluateValidatorSafetyGate } from "@/lib/payments/validator-safety-gate"

test("validator safety gate requires HITL above USD 100 equivalent", () => {
  const decision = evaluateValidatorSafetyGate({
    amount_minor: 10001,
    currency: "USD",
    human_confirmed: false,
    mfa_verified: true,
  })

  assert.equal(decision.requiresHitl, true)
  assert.equal(decision.allowed, false)
  assert.ok(decision.reasonCodes.includes("AMOUNT_EXCEEDS_USD_HITL_THRESHOLD"))
  assert.ok(decision.reasonCodes.includes("HITL_CONFIRMATION_REQUIRED"))
})

test("validator safety gate requires MFA above INR 8,000 equivalent", () => {
  const decision = evaluateValidatorSafetyGate({
    amount_minor: 800001,
    currency: "INR",
    human_confirmed: true,
    mfa_verified: false,
  })

  assert.equal(decision.requiresMfa, true)
  assert.equal(decision.allowed, false)
  assert.ok(decision.reasonCodes.includes("AMOUNT_EXCEEDS_INR_MFA_THRESHOLD"))
  assert.ok(decision.reasonCodes.includes("MFA_REQUIRED"))
})
