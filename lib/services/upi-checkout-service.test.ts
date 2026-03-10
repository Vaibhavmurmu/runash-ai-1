import test from "node:test"
import assert from "node:assert/strict"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

test("UPI initiation is idempotent by key", () => {
  const first = UpiCheckoutService.initiatePayment("init-key-1", 499)
  const second = UpiCheckoutService.initiatePayment("init-key-1", 499)

  assert.equal(first.transactionId, second.transactionId)
  assert.equal(second.idempotencyKey, "init-key-1")
})

test("UPI confirmation enforces retry limit and returns structured codes", () => {
  const initiated = UpiCheckoutService.initiatePayment("init-key-2", 999)

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
  const initiated = UpiCheckoutService.initiatePayment("init-key-3", 1200)
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

test("UPI transaction details include receipt id and amount", () => {
  const initiated = UpiCheckoutService.initiatePayment("init-key-4", 777)
  const details = UpiCheckoutService.getTransactionDetails(initiated.transactionId)

  assert.equal(details.found, true)
  assert.equal(details.payload.amount, 777)
  assert.match(details.payload.receiptId, /^RCPT-/)
})


test("UPI provider callback maps external statuses to canonical statuses and updates order record", () => {
  const initiated = UpiCheckoutService.initiatePayment("init-key-provider-1", 305, "order_provider_1")

  const callback = UpiCheckoutService.applyProviderCallback({
    transactionId: initiated.transactionId,
    providerStatus: "PROCESSING",
    providerEventId: "evt_upi_1",
  })

  assert.equal(callback.ok, true)
  if (!callback.ok) throw new Error("Expected callback to succeed")
  assert.equal(callback.status, "pending")

  const terminal = UpiCheckoutService.applyProviderCallback({
    transactionId: initiated.transactionId,
    providerStatus: "SUCCESS",
    providerReference: "prov_ref_1",
    providerEventId: "evt_upi_2",
  })

  assert.equal(terminal.ok, true)
  if (!terminal.ok) throw new Error("Expected callback to succeed")
  assert.equal(terminal.status, "success")

  const status = UpiCheckoutService.getStatus(initiated.transactionId)
  assert.equal(status.payload.status, "success")
  assert.equal(status.payload.isVerified, true)

  const order = UpiCheckoutService.getOrderRecord("order_provider_1")
  assert.ok(order)
  assert.equal(order?.status, "success")
})

test("UPI provider callback is idempotent by provider event id", () => {
  const initiated = UpiCheckoutService.initiatePayment("init-key-provider-2", 450)

  const first = UpiCheckoutService.applyProviderCallback({
    transactionId: initiated.transactionId,
    providerStatus: "FAILED",
    providerEventId: "evt_upi_dup",
  })

  const second = UpiCheckoutService.applyProviderCallback({
    transactionId: initiated.transactionId,
    providerStatus: "SUCCESS",
    providerEventId: "evt_upi_dup",
  })

  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  if (!second.ok) throw new Error("Expected callback to be idempotent")
  assert.equal(second.idempotent, true)
})
