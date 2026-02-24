import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import test from "node:test"

import { verifyWebhookSignature } from "./verify-signature"

function sign(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

test("verifyWebhookSignature validates resend signatures", () => {
  process.env.RESEND_WEBHOOK_SECRET = "resend-secret"
  const payload = JSON.stringify({ ping: true })
  const signature = `v1=${sign(process.env.RESEND_WEBHOOK_SECRET, payload)}`
  const headers = new Headers({ "resend-signature": signature })

  const result = verifyWebhookSignature("resend", payload, headers)
  assert.equal(result.ok, true)
})

test("verifyWebhookSignature rejects invalid sendgrid signatures", () => {
  process.env.SENDGRID_WEBHOOK_SECRET = "sendgrid-secret"
  const payload = JSON.stringify({ event: "delivered" })
  const headers = new Headers({ "x-sendgrid-signature": "bad-signature" })

  const result = verifyWebhookSignature("sendgrid", payload, headers)
  assert.equal(result.ok, false)
})

test("verifyWebhookSignature enforces strict mode for missing generic secret", () => {
  process.env.EMAIL_WEBHOOK_STRICT_SIGNATURE = "true"
  delete process.env.GENERIC_EMAIL_WEBHOOK_SECRET

  const result = verifyWebhookSignature("generic", "{}", new Headers())
  assert.equal(result.ok, false)

  delete process.env.EMAIL_WEBHOOK_STRICT_SIGNATURE
})
