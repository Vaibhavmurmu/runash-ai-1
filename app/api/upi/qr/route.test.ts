import assert from "node:assert/strict"
import test from "node:test"

import { NextRequest } from "next/server"

import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

const { GET } = await import("./route")

test("GET /api/upi/qr returns QR payload for a valid transaction", async () => {
  const initiated = UpiCheckoutService.initiatePayment(`qr-init-${Date.now()}`, 199.5)

  const response = await GET(
    new NextRequest(`http://localhost/api/upi/qr?transactionId=${encodeURIComponent(initiated.transactionId)}`),
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
  assert.deepEqual(payload, { error: "transactionId is required" })
})

test("GET /api/upi/qr returns 404 for unknown transaction", async () => {
  const response = await GET(new NextRequest("http://localhost/api/upi/qr?transactionId=UPI-MISSING"))
  const payload = await response.json()

  assert.equal(response.status, 404)
  assert.deepEqual(payload, { error: "Transaction not found" })
})
