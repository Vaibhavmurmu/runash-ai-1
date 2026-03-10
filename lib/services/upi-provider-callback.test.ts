import assert from "node:assert/strict"
import { createHmac } from "crypto"
import test from "node:test"

import {
  parseUpiProviderCallbackPayload,
  parseProviderStatus,
  verifyUpiProviderSignature,
} from "@/lib/services/upi-provider-callback"

test("verifyUpiProviderSignature validates signed payload", () => {
  const payload = JSON.stringify({ transactionId: "UPI-1", status: "SUCCESS" })
  const secret = "webhook_secret"
  const signature = createHmac("sha256", secret).update(payload).digest("hex")

  assert.equal(verifyUpiProviderSignature({ payload, signature, secret }), true)
  assert.equal(verifyUpiProviderSignature({ payload, signature: "bad", secret }), false)
})

test("parseProviderStatus only accepts known provider states", () => {
  assert.equal(parseProviderStatus("success"), "SUCCESS")
  assert.equal(parseProviderStatus("processing"), "PROCESSING")
  assert.equal(parseProviderStatus("unknown"), null)
})

test("parseUpiProviderCallbackPayload validates required callback fields", () => {
  assert.equal(parseUpiProviderCallbackPayload(null), null)

  const parsed = parseUpiProviderCallbackPayload({
    transactionId: "UPI-2",
    status: "FAILED",
    providerReference: "provider_ref_42",
    eventId: "evt_42",
  })

  assert.ok(parsed)
  assert.equal(parsed?.transactionId, "UPI-2")
  assert.equal(parsed?.status, "FAILED")
  assert.equal(parsed?.eventId, "evt_42")
})
