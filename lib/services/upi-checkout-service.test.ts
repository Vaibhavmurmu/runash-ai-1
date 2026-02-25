import test from "node:test"
import assert from "node:assert/strict"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

test("UPI initiation is idempotent by key", () => {
  const first = UpiCheckoutService.initiatePayment("init-key-1")
  const second = UpiCheckoutService.initiatePayment("init-key-1")

  assert.equal(first.transactionId, second.transactionId)
  assert.equal(second.idempotencyKey, "init-key-1")
})

test("UPI confirmation enforces retry limit and returns structured codes", () => {
  const initiated = UpiCheckoutService.initiatePayment("init-key-2")

  const firstInvalid = UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "999999",
    idempotencyKey: "confirm-key-1",
  })
  assert.equal(firstInvalid.ok, false)
  if (firstInvalid.ok) throw new Error("Expected invalid confirmation")
  assert.equal(firstInvalid.code, "INVALID_PIN")

  const secondInvalid = UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "999999",
    idempotencyKey: "confirm-key-2",
  })
  assert.equal(secondInvalid.ok, false)
  if (secondInvalid.ok) throw new Error("Expected invalid confirmation")
  assert.equal(secondInvalid.code, "INVALID_PIN")

  const thirdInvalid = UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "999999",
    idempotencyKey: "confirm-key-3",
  })
  assert.equal(thirdInvalid.ok, false)
  if (thirdInvalid.ok) throw new Error("Expected invalid confirmation")
  assert.equal(thirdInvalid.code, "PIN_ATTEMPTS_EXCEEDED")

  const blocked = UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "123456",
    idempotencyKey: "confirm-key-4",
  })
  assert.equal(blocked.ok, false)
  if (blocked.ok) throw new Error("Expected blocked confirmation")
  assert.equal(blocked.code, "PIN_ATTEMPTS_EXCEEDED")
})

test("UPI confirmation reuses idempotency key result", () => {
  const initiated = UpiCheckoutService.initiatePayment("init-key-3")
  const first = UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "123456",
    idempotencyKey: "confirm-key-idem",
  })
  const second = UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "000000",
    idempotencyKey: "confirm-key-idem",
  })

  assert.deepEqual(second, first)
})
