import assert from "node:assert/strict"
import test from "node:test"

import { NextRequest } from "next/server"

import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

const { POST } = await import("./route")

test("POST /api/upi/complete returns success payload", async () => {
  const initiated = UpiCheckoutService.initiatePayment(`complete-success-${Date.now()}`, 220)

  const response = await POST(
    new NextRequest("http://localhost/api/upi/complete", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "idem-1" },
      body: JSON.stringify({ transactionId: initiated.transactionId }),
    }),
  )

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.ok, true)
  assert.equal(payload.transactionId, initiated.transactionId)
  assert.equal(payload.status, "success")
  assert.equal(typeof payload.transactionReference, "string")
  assert.equal(payload.idempotencyKey, "idem-1")
})

test("POST /api/upi/complete is idempotent on repeat", async () => {
  const initiated = UpiCheckoutService.initiatePayment(`complete-idem-${Date.now()}`, 180)

  const request = () =>
    POST(
      new NextRequest("http://localhost/api/upi/complete", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "idem-repeat" },
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
  assert.equal(first.status, "success")
  assert.equal(second.status, "success")
  assert.equal(first.idempotencyKey, "idem-repeat")
  assert.equal(second.idempotencyKey, "idem-repeat")
})

test("POST /api/upi/complete returns failed transaction payload", async () => {
  const initiated = UpiCheckoutService.initiatePayment(`complete-fail-${Date.now()}`, 310)

  UpiCheckoutService.confirmPayment({ transactionId: initiated.transactionId, pin: "000000", idempotencyKey: "f1" })
  UpiCheckoutService.confirmPayment({ transactionId: initiated.transactionId, pin: "000000", idempotencyKey: "f2" })
  UpiCheckoutService.confirmPayment({ transactionId: initiated.transactionId, pin: "000000", idempotencyKey: "f3" })

  const response = await POST(
    new NextRequest("http://localhost/api/upi/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transactionId: initiated.transactionId, idempotencyKey: "idem-failed" }),
    }),
  )

  const payload = await response.json()
  assert.equal(response.status, 400)
  assert.equal(payload.errorCode, "PIN_ATTEMPTS_EXCEEDED")
  assert.equal(typeof payload.error, "string")
})

test("POST /api/upi/complete returns 429 when rate limited", async () => {
  const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`

  for (let i = 0; i < 20; i += 1) {
    const response = await POST(
      new NextRequest("http://localhost/api/upi/complete", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({ transactionId: `UPI-RL-${i}` }),
      }),
    )
    assert.notEqual(response.status, 429)
  }

  const blocked = await POST(
    new NextRequest("http://localhost/api/upi/complete", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ transactionId: "UPI-RL-BLOCK" }),
    }),
  )

  const payload = await blocked.json()
  assert.equal(blocked.status, 429)
  assert.deepEqual(payload, {
    error: "UPI completion is temporarily blocked due to risk controls.",
    errorCode: "RISK_BLOCKED",
  })
})
