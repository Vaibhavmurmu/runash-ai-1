import test from "node:test"
import assert from "node:assert/strict"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

test("UPI initiation is idempotent by key", async () => {
  const first = await UpiCheckoutService.initiatePayment("init-key-1", 499)
  const second = await UpiCheckoutService.initiatePayment("init-key-1", 499)

  assert.equal(first.transactionId, second.transactionId)
  assert.equal(second.idempotencyKey, "init-key-1")
})

test("UPI confirmation enforces retry limit and returns structured codes", async () => {
  const initiated = await UpiCheckoutService.initiatePayment("init-key-2", 999)

  const firstInvalid = await UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "999999",
    idempotencyKey: "confirm-key-1",
  })
  assert.equal(firstInvalid.ok, false)
  if (firstInvalid.ok) throw new Error("Expected invalid confirmation")
  assert.equal(firstInvalid.code, "INVALID_PIN")

  const secondInvalid = await UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "999999",
    idempotencyKey: "confirm-key-2",
  })
  assert.equal(secondInvalid.ok, false)
  if (secondInvalid.ok) throw new Error("Expected invalid confirmation")
  assert.equal(secondInvalid.code, "INVALID_PIN")

  const thirdInvalid = await UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "999999",
    idempotencyKey: "confirm-key-3",
  })
  assert.equal(thirdInvalid.ok, false)
  if (thirdInvalid.ok) throw new Error("Expected invalid confirmation")
  assert.equal(thirdInvalid.code, "PIN_ATTEMPTS_EXCEEDED")

  const blocked = await UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "123456",
    idempotencyKey: "confirm-key-4",
  })
  assert.equal(blocked.ok, false)
  if (blocked.ok) throw new Error("Expected blocked confirmation")
  assert.equal(blocked.code, "PIN_ATTEMPTS_EXCEEDED")
})

test("UPI confirmation reuses idempotency key result", async () => {
  const initiated = await UpiCheckoutService.initiatePayment("init-key-3", 1200)
  const first = await UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "123456",
    idempotencyKey: "confirm-key-idem",
  })
  const second = await UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "000000",
    idempotencyKey: "confirm-key-idem",
  })

  assert.deepEqual(second, first)
})

test("UPI transaction details include receipt id and amount", async () => {
  const initiated = await UpiCheckoutService.initiatePayment("init-key-4", 777)
  const details = await UpiCheckoutService.getTransactionDetails(initiated.transactionId)

  assert.equal(details.found, true)
  assert.equal(details.payload.amount, 777)
  assert.match(details.payload.receiptId, /^RCPT-/)
})
