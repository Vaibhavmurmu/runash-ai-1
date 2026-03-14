import test from "node:test"
import assert from "node:assert/strict"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

test("UPI initiation is idempotent by key", async () => {
  const first = await UpiCheckoutService.initiatePayment("init-key-1", 499, 1001, "u-1")
  const second = await UpiCheckoutService.initiatePayment("init-key-1", 499, 1001, "u-1")

  assert.equal(first.transactionId, second.transactionId)
  assert.equal(second.idempotencyKey, "init-key-1")
  assert.equal(second.order_id, 1001)
})

test("UPI confirmation enforces retry limit and returns structured codes", async () => {
  const initiated = await UpiCheckoutService.initiatePayment("init-key-2", 999, 1002, "u-2")

  const firstInvalid = await UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "999999",
    idempotencyKey: "confirm-key-1",
    userId: "u-2",
  })
  assert.equal(firstInvalid.ok, false)
  if (firstInvalid.ok) throw new Error("Expected invalid confirmation")
  assert.equal(firstInvalid.code, "INVALID_PIN")

  const secondInvalid = await UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "999999",
    idempotencyKey: "confirm-key-2",
    userId: "u-2",
  })
  assert.equal(secondInvalid.ok, false)
  if (secondInvalid.ok) throw new Error("Expected invalid confirmation")
  assert.equal(secondInvalid.code, "INVALID_PIN")

  const thirdInvalid = await UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "999999",
    idempotencyKey: "confirm-key-3",
    userId: "u-2",
  })
  assert.equal(thirdInvalid.ok, false)
  if (thirdInvalid.ok) throw new Error("Expected invalid confirmation")
  assert.equal(thirdInvalid.code, "PIN_ATTEMPTS_EXCEEDED")

  const blocked = await UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "123456",
    idempotencyKey: "confirm-key-4",
    userId: "u-2",
  })
  assert.equal(blocked.ok, false)
  if (blocked.ok) throw new Error("Expected blocked confirmation")
  assert.equal(blocked.code, "PIN_ATTEMPTS_EXCEEDED")
})

test("UPI confirmation reuses idempotency key result", async () => {
  const initiated = await UpiCheckoutService.initiatePayment("init-key-3", 1200, 1003, "u-3")
  const first = await UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "123456",
    idempotencyKey: "confirm-key-idem",
    userId: "u-3",
  })
  const second = await UpiCheckoutService.confirmPayment({
    transactionId: initiated.transactionId,
    pin: "000000",
    idempotencyKey: "confirm-key-idem",
    userId: "u-3",
  })

  assert.deepEqual(second, first)
})

test("UPI transaction details include receipt id and amount", async () => {
  const initiated = await UpiCheckoutService.initiatePayment("init-key-4", 777, 1004, "u-4")
  const details = await UpiCheckoutService.getTransactionDetails(initiated.transactionId)

  assert.equal(details.found, true)
  assert.equal(details.payload.amount, 777)
  assert.equal(details.payload.order_id, 1004)
  assert.match(details.payload.receiptId, /^RCPT-/)
})


test("UPI provider callback maps external statuses to canonical statuses", async () => {
  const initiated = await UpiCheckoutService.initiatePayment("init-key-provider-1", 305, "order_provider_1", "u-1")

  const callback = await UpiCheckoutService.applyProviderCallback({
    transactionId: initiated.transactionId,
    providerStatus: "PROCESSING",
    providerEventId: "evt_upi_1",
  })

  assert.equal(callback.ok, true)
  if (!callback.ok) throw new Error("Expected callback to succeed")
  assert.equal(callback.status, "pending")

  const terminal = await UpiCheckoutService.applyProviderCallback({
    transactionId: initiated.transactionId,
    providerStatus: "SUCCESS",
    providerReference: "prov_ref_1",
    providerEventId: "evt_upi_2",
  })

  assert.equal(terminal.ok, true)
  if (!terminal.ok) throw new Error("Expected callback to succeed")
  assert.equal(terminal.status, "success")

  const status = await UpiCheckoutService.getStatus(initiated.transactionId)
  assert.equal(status.payload.status, "success")
})

test("UPI provider callback is idempotent by provider event id", async () => {
  const initiated = await UpiCheckoutService.initiatePayment("init-key-provider-2", 450, "order_provider_2", "u-2")

  const first = await UpiCheckoutService.applyProviderCallback({
    transactionId: initiated.transactionId,
    providerStatus: "FAILED",
    providerEventId: "evt_upi_dup",
  })

  const second = await UpiCheckoutService.applyProviderCallback({
    transactionId: initiated.transactionId,
    providerStatus: "SUCCESS",
    providerEventId: "evt_upi_dup",
  })

  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  if (!second.ok) throw new Error("Expected callback to be idempotent")
  assert.equal(second.idempotent, true)
})
