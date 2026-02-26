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


test("sanitizePaymentActivityDetails redacts PAN/CVV/secrets across wallet payloads", () => {
  const sanitized = sanitizePaymentActivityDetails({
    cardNumber: "4242 4242 4242 4242",
    pan: "5555444433331111",
    cvv: "123",
    otp: 123456,
    apiSecret: "shh-abc",
  })

  assert.equal(sanitized.cardNumber, "*4242")
  assert.equal(sanitized.pan, "*1111")
  assert.equal(sanitized.cvv, "[REDACTED]")
  assert.equal(sanitized.otp, "[REDACTED]")
  assert.equal(sanitized.apiSecret, "[REDACTED]")
})
