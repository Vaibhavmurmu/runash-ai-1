import assert from "node:assert/strict"
import test from "node:test"

import { NextRequest } from "next/server"

import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

process.env.FEATURE_FLAG_UPI_SANDBOX_COMPLETE = "true"

const { POST } = await import("./route")

test("POST /api/upi/complete returns success payload", async () => {
  const initiated = await UpiCheckoutService.initiatePayment(`complete-success-${Date.now()}`, 220, 11, "user-c1")

  const response = await POST(
    new NextRequest("http://localhost/api/upi/complete", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "idem-1", "x-user-id": "user-c1" },
      body: JSON.stringify({ transactionId: initiated.transactionId }),
    }),
  )

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.ok, true)
  assert.equal(payload.transactionId, initiated.transactionId)
  assert.equal(typeof payload.transactionReference, "string")
  assert.equal(payload.idempotencyKey, "idem-1")
})

test("POST /api/upi/complete is idempotent on repeat", async () => {
  const initiated = await UpiCheckoutService.initiatePayment(`complete-idem-${Date.now()}`, 180, 12, "user-c2")

  const request = () =>
    POST(
      new NextRequest("http://localhost/api/upi/complete", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "idem-repeat", "x-user-id": "user-c2" },
        body: JSON.stringify({ transactionId: initiated.transactionId }),
      }),
    )

  const firstRes = await request()
  const secondRes = await request()
  const first = await firstRes.json()
  const second = await secondRes.json()

  assert.equal(firstRes.status, 200)
  assert.equal(secondRes.status, 200)
  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  assert.equal(first.transactionId, initiated.transactionId)
  assert.equal(second.transactionId, initiated.transactionId)
  assert.equal(first.idempotencyKey, "idem-repeat")
  assert.equal(second.idempotencyKey, "idem-repeat")
})

test("POST /api/upi/complete rejects ownership mismatch", async () => {
  const initiated = await UpiCheckoutService.initiatePayment(`complete-owner-${Date.now()}`, 210, 13, "user-owner")

  const response = await POST(
    new NextRequest("http://localhost/api/upi/complete", {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "user-other" },
      body: JSON.stringify({ transactionId: initiated.transactionId, idempotencyKey: "idem-owner" }),
    }),
  )

  assert.equal(response.status, 400)
})
