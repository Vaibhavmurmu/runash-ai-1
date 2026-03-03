import assert from "node:assert/strict"
import test from "node:test"

import { POST } from "@/app/api/email/webhook/status/route"

test("status webhook endpoint validates provider", async () => {
  const request = new Request("http://localhost/api/email/webhook/status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "bad-provider", payload: {} }),
  })

  const response = await POST(request as never)
  const payload = await response.json()

  assert.equal(response.status, 400)
  assert.equal(payload.error, "Unsupported email webhook provider")
})
