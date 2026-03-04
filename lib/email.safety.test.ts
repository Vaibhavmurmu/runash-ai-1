import assert from "node:assert/strict"
import test from "node:test"

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://user:pass@localhost:5432/db"

test("applyEmailSafetyPolicy rewrites non-allowlisted recipients when sink is configured", async () => {
  const { applyEmailSafetyPolicy } = await import("@/lib/email")

  process.env.EMAIL_SAFE_MODE = "true"
  process.env.EMAIL_TEST_RECIPIENTS = "allowed@example.com"
  process.env.EMAIL_SAFE_SINK_RECIPIENT = "sink@example.com"

  const result = applyEmailSafetyPolicy("blocked@example.com")

  assert.equal(result.rewritten, true)
  assert.deepEqual(result.recipients, ["sink@example.com"])
})

test("sendEmail blocks suppressed recipients before provider send", async () => {
  const emailModule = await import("@/lib/email")
  const { EmailBounceHandler } = await import("@/lib/email-bounce-handler")

  process.env.EMAIL_SAFE_MODE = "false"
  const original = EmailBounceHandler.validateEmailForSending
  EmailBounceHandler.validateEmailForSending = async () => ({ canSend: false, reason: "suppressed", suppressionType: "bounce" })

  await assert.rejects(
    () =>
      emailModule.sendEmail({
        to: "blocked@example.com",
        subject: "Suppression test",
        html: "<p>blocked</p>",
        track_delivery: false,
      }),
    /Cannot send email: suppressed/,
  )

  EmailBounceHandler.validateEmailForSending = original
})
