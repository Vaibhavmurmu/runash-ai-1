import assert from "node:assert/strict"
import test from "node:test"

import { handleEmailWebhookPost } from "@/app/api/email/webhook/[provider]/route"

test("email webhook endpoint rejects unsupported provider", async () => {
  const request = new Request("http://localhost/api/email/webhook/unsupported", {
    method: "POST",
    body: JSON.stringify({ event: "delivered" }),
    headers: { "content-type": "application/json" },
  })

  const response = await handleEmailWebhookPost(request, "unsupported")
  const payload = await response.json()

  assert.equal(response.status, 404)
  assert.equal(payload.error, "Unsupported email webhook provider")
})
