import assert from "node:assert/strict"
import test from "node:test"

import { renderBroadcastTemplate } from "@/lib/email-broadcast-templates"

test("renderBroadcastTemplate escapes HTML input and renders text fallback", () => {
  const rendered = renderBroadcastTemplate({
    templateKey: "marketing.announcement",
    props: {
      heading: "<script>alert(1)</script>",
      body: "Hi <b>team</b>",
      ctaLabel: "Go",
      ctaUrl: "https://runash.in/path",
    },
    context: {
      subject: "Subject",
      recipient: {
        email: "ops@runash.in",
        name: "Admin <img src=x onerror=alert(1)>",
      },
    },
  })

  assert.equal(rendered.html.includes("<script>alert(1)</script>"), false)
  assert.equal(rendered.html.includes("Admin <img"), false)
  assert.equal(rendered.text.includes("Subject") || rendered.text.includes("Hi"), true)
})


test("renderBroadcastTemplate throws for unsupported key", () => {
  assert.throws(
    () =>
      renderBroadcastTemplate({
        templateKey: "unknown.key",
        props: {},
        context: { subject: "x" },
      }),
    /Unsupported broadcast template key/,
  )
})
