import assert from "node:assert/strict"
import test from "node:test"

import { sanitizePaymentActivityDetails } from "@/lib/payments/logging-sanitizer"

test("sanitizePaymentActivityDetails masks payment identifiers and sensitive auth fields", () => {
  const sanitized = sanitizePaymentActivityDetails({
    paymentMethodId: "pm_1QxAbC1234242",
    intentId: "pi_1234567890",
    providerTransactionId: "txn-99887766",
    otp: "123456",
    amount: 1200,
  })

  assert.equal(sanitized.paymentMethodId, "*4242")
  assert.equal(sanitized.intentId, "*7890")
  assert.equal(sanitized.providerTransactionId, "*7766")
  assert.equal(sanitized.otp, "[REDACTED]")
  assert.equal(sanitized.amount, 1200)
})
