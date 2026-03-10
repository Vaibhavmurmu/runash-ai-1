import test from "node:test"
import assert from "node:assert/strict"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

test("UPI initiation is idempotent by key", () => {
  const first = UpiCheckoutService.initiatePayment({ idempotencyKey: "init-key-1", amount: 499, payerUpiId: "user@upi", userId: "u-1" })
  const second = UpiCheckoutService.initiatePayment({ idempotencyKey: "init-key-1", amount: 499, payerUpiId: "user@upi", userId: "u-1" })

  assert.equal(first.transactionId, second.transactionId)
  assert.equal(second.idempotencyKey, "init-key-1")
})

test("UPI confirmation enforces retry limit and returns structured codes", () => {
  const initiated = UpiCheckoutService.initiatePayment({ idempotencyKey: "init-key-2", amount: 999, payerUpiId: "user@upi", userId: "u-2" })

  const firstInvalid = UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "999999",
    idempotencyKey: "confirm-key-1",
    userId: "u-2",
  })
  assert.equal(firstInvalid.ok, false)
  if (firstInvalid.ok) throw new Error("Expected invalid confirmation")
  assert.equal(firstInvalid.code, "INVALID_PIN")

  const secondInvalid = UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "999999",
    idempotencyKey: "confirm-key-2",
    userId: "u-2",
  })
  assert.equal(secondInvalid.ok, false)
  if (secondInvalid.ok) throw new Error("Expected invalid confirmation")
  assert.equal(secondInvalid.code, "INVALID_PIN")

  const thirdInvalid = UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "999999",
    idempotencyKey: "confirm-key-3",
    userId: "u-2",
  })
  assert.equal(thirdInvalid.ok, false)
  if (thirdInvalid.ok) throw new Error("Expected invalid confirmation")
  assert.equal(thirdInvalid.code, "PIN_ATTEMPTS_EXCEEDED")

  const blocked = UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "123456",
    idempotencyKey: "confirm-key-4",
    userId: "u-2",
  })
  assert.equal(blocked.ok, false)
  if (blocked.ok) throw new Error("Expected blocked confirmation")
  assert.equal(blocked.code, "PIN_ATTEMPTS_EXCEEDED")
})

test("UPI confirmation reuses idempotency key result", () => {
  const initiated = UpiCheckoutService.initiatePayment({ idempotencyKey: "init-key-3", amount: 1200, payerUpiId: "user@upi", userId: "u-3" })
  const first = UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "123456",
    idempotencyKey: "confirm-key-idem",
    userId: "u-3",
  })
  const second = UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "000000",
    idempotencyKey: "confirm-key-idem",
    userId: "u-3",
  })

  assert.deepEqual(second, first)
})

test("UPI transaction details include receipt id and amount", () => {
  const initiated = UpiCheckoutService.initiatePayment({ idempotencyKey: "init-key-4", amount: 777, payerUpiId: "user@upi", userId: "u-4" })
  const details = UpiCheckoutService.getTransactionDetails(initiated.transactionId)

  assert.equal(details.found, true)
  assert.equal(details.payload.amount, 777)
  assert.match(details.payload.receiptId, /^RCPT-/)
})

test("UPI completion reuses idempotency key and enforces ownership", () => {
  const initiated = UpiCheckoutService.initiatePayment({ idempotencyKey: "init-key-5", amount: 321, payerUpiId: "user@upi", userId: "u-5" })
  const first = UpiCheckoutService.completeViaProvider({ transactionId: initiated.transactionId, idempotencyKey: "complete-1", userId: "u-5" })
  const replay = UpiCheckoutService.completeViaProvider({ transactionId: initiated.transactionId, idempotencyKey: "complete-1", userId: "u-5" })

  assert.deepEqual(replay, first)

  const ownershipMismatch = UpiCheckoutService.completeViaProvider({
    transactionId: initiated.transactionId,
    idempotencyKey: "complete-2",
    userId: "attacker",
  })
  assert.equal(ownershipMismatch.ok, false)
})
