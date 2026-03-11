import assert from "node:assert/strict"
import test from "node:test"

import { NextRequest } from "next/server"

import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

const { GET } = await import("./route")

test("GET /api/upi/qr returns QR payload for a valid transaction", async () => {
  const initiated = await UpiCheckoutService.initiatePayment(`qr-init-${Date.now()}`, 199.5, 101, "user-1")

  const response = await GET(
    new NextRequest(`http://localhost/api/upi/qr?transactionId=${encodeURIComponent(initiated.transactionId)}`, {
      headers: { "x-user-id": "user-1" },
    }),
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.transactionId, initiated.transactionId)
  assert.equal(payload.amount, 199.5)
  assert.equal(payload.currency, "INR")
  assert.equal(typeof payload.upiUri, "string")
  assert.match(payload.upiUri, /^upi:\/\/pay\?/) 
  assert.equal(typeof payload.qrDataUrl, "string")
  assert.match(payload.qrDataUrl, /^data:image\/png;base64,/) 
})

test("GET /api/upi/qr rejects request without transactionId", async () => {
  const response = await GET(new NextRequest("http://localhost/api/upi/qr"))
  const payload = await response.json()

  assert.equal(response.status, 400)
  assert.deepEqual(payload, { error: "transactionId is required", errorCode: "RISK_BLOCKED" })
})

test("GET /api/upi/qr returns 403 for ownership mismatch", async () => {
  const initiated = await UpiCheckoutService.initiatePayment(`qr-owner-${Date.now()}`, 100, 202, "user-owner")

  const response = await GET(
    new NextRequest(`http://localhost/api/upi/qr?transactionId=${encodeURIComponent(initiated.transactionId)}`, {
      headers: { "x-user-id": "other-user" },
    }),
  )

  assert.equal(response.status, 403)
})
