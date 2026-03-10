import test from "node:test"
import assert from "node:assert/strict"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

const mockSql = async (_strings: TemplateStringsArray, ...values: unknown[]) => {
  if (values.length > 0 && typeof values[0] === "number") {
    return [{ id: values[0] }]
  }
  return [{ id: 1 }]
}

test("UPI initiation is idempotent by key", async () => {
  const first = await UpiCheckoutService.initiatePayment("init-key-1", 499, 1001, mockSql as never)
  const second = await UpiCheckoutService.initiatePayment("init-key-1", 499, 1001, mockSql as never)

  assert.equal(first.transactionId, second.transactionId)
  assert.equal(second.idempotencyKey, "init-key-1")
  assert.equal(second.order_id, 1001)
})

test("UPI confirmation enforces retry limit and returns structured codes", async () => {
  const initiated = await UpiCheckoutService.initiatePayment("init-key-2", 999, 1002, mockSql as never)

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

test("UPI confirmation reuses idempotency key result", async () => {
  const initiated = await UpiCheckoutService.initiatePayment("init-key-3", 1200, 1003, mockSql as never)
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

test("UPI transaction details include receipt id, amount, and order_id", async () => {
  const initiated = await UpiCheckoutService.initiatePayment("init-key-4", 777, 1004, mockSql as never)
  const details = await UpiCheckoutService.getTransactionDetails(initiated.transactionId, mockSql as never)

  assert.equal(details.found, true)
  assert.equal(details.payload.amount, 777)
  assert.equal(details.payload.order_id, 1004)
  assert.match(details.payload.receiptId, /^RCPT-/)
})
