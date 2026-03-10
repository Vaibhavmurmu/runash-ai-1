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

test("UPI status transitions from pending to terminal with explicit status payload fields", async () => {
  const initiated = UpiCheckoutService.initiatePayment("init-key-5", 875)

  const confirmation = UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "123456",
    idempotencyKey: "confirm-key-pending",
  })
  assert.equal(confirmation.ok, true)
  if (!confirmation.ok) throw new Error("Expected successful confirmation")
  assert.equal(confirmation.status, "pending")

  await new Promise((resolve) => setTimeout(resolve, 6_500))

  const status = UpiCheckoutService.getStatus(initiated.transactionId)
  assert.equal(status.found, true)
  assert.equal(status.payload.transactionId, initiated.transactionId)
  assert.equal(status.payload.amount, 875)
  assert.equal(status.payload.currency, "INR")
  assert.equal(typeof status.payload.transactionReference, "string")
  assert.ok(status.payload.status === "success" || status.payload.status === "failed")
  if (status.payload.status === "failed") {
    assert.equal(typeof status.payload.failedReason, "string")
  }
})

test("UPI completeViaProvider returns explicit contract fields for success, idempotent repeat, and failed transaction", () => {
  const successTxn = UpiCheckoutService.initiatePayment("init-key-6", 305)
  const first = UpiCheckoutService.completeViaProvider({
    transactionId: successTxn.transactionId,
    idempotencyKey: "complete-key-1",
  })
  assert.equal(first.ok, true)
  if (!first.ok) throw new Error("Expected completeViaProvider success")
  assert.equal(first.transactionId, successTxn.transactionId)
  assert.equal(first.status, "success")
  assert.equal(typeof first.transactionReference, "string")
  assert.equal(first.idempotencyKey, "complete-key-1")

  const repeat = UpiCheckoutService.completeViaProvider({
    transactionId: successTxn.transactionId,
    idempotencyKey: "complete-key-2",
  })
  assert.equal(repeat.ok, true)
  if (!repeat.ok) throw new Error("Expected idempotent success")
  assert.equal(repeat.transactionId, successTxn.transactionId)
  assert.equal(repeat.status, "success")
  assert.equal(typeof repeat.transactionReference, "string")
  assert.equal(repeat.idempotencyKey, "complete-key-2")

  const failedTxn = UpiCheckoutService.initiatePayment("init-key-7", 440)
  UpiCheckoutService.confirmPayment({
    transactionId: failedTxn.transactionId,
    pin: "000000",
    idempotencyKey: "force-fail-1",
  })
  UpiCheckoutService.confirmPayment({
    transactionId: failedTxn.transactionId,
    pin: "000000",
    idempotencyKey: "force-fail-2",
  })
  UpiCheckoutService.confirmPayment({
    transactionId: failedTxn.transactionId,
    pin: "000000",
    idempotencyKey: "force-fail-3",
  })

  const failed = UpiCheckoutService.completeViaProvider({
    transactionId: failedTxn.transactionId,
    idempotencyKey: "complete-key-failed",
  })
  assert.equal(failed.ok, false)
  if (failed.ok) throw new Error("Expected failed transaction")
  assert.equal(failed.errorCode, "PIN_ATTEMPTS_EXCEEDED")
  assert.equal(typeof failed.error, "string")
})

test("UPI getStatus returns stable not-found contract fields", () => {
  const status = UpiCheckoutService.getStatus("UPI-MISSING-STATUS")

  assert.equal(status.found, false)
  assert.equal(status.payload.transactionId, "UPI-MISSING-STATUS")
  assert.equal(status.payload.amount, 0)
  assert.equal(status.payload.currency, "INR")
  assert.equal(status.payload.status, "failed")
  assert.equal(status.payload.errorCode, "RISK_BLOCKED")
  assert.equal(typeof status.payload.transactionReference, "string")
  assert.equal(typeof status.payload.failedReason, "string")
})
