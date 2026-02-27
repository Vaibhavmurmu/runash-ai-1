import assert from "node:assert/strict"
import test from "node:test"

import { normalizeProviderWebhook } from "./index"

test("normalizeProviderWebhook maps resend delivery events", () => {
  const result = normalizeProviderWebhook("resend", {
    id: "evt_1",
    type: "email.delivered",
    created_at: "2026-02-24T00:00:00.000Z",
    data: {
      email: "User@example.com",
      email_id: "msg_1",
    },
  })

  assert.equal(result.ignoredCount, 0)
  assert.equal(result.events[0]?.type, "delivered")
  assert.equal(result.events[0]?.messageId, "msg_1")
})

test("normalizeProviderWebhook maps sendgrid bounce and complaint events", () => {
  const bounce = normalizeProviderWebhook("sendgrid", {
    event: "bounce",
    email: "bounce@example.com",
    sg_message_id: "bounce-message.1",
    sg_event_id: "sg_evt_1",
    timestamp: 1700000000,
  })

  const complaint = normalizeProviderWebhook("sendgrid", {
    event: "spamreport",
    email: "complaint@example.com",
    sg_message_id: "complaint-message.1",
    sg_event_id: "sg_evt_2",
    timestamp: 1700000001,
  })

  assert.equal(bounce.events[0]?.type, "bounced")
  assert.equal(complaint.events[0]?.type, "complaint")
})

test("normalizeProviderWebhook maps ses complaint recipient", () => {
  const sesPayload = {
    Type: "Notification",
    Message: JSON.stringify({
      notificationType: "Complaint",
      mail: {
        messageId: "ses_msg_1",
        timestamp: "2026-02-24T00:00:00.000Z",
      },
      complaint: {
        complainedRecipients: [{ emailAddress: "ses@example.com" }],
      },
    }),
  }

  const result = normalizeProviderWebhook("ses", sesPayload)
  assert.equal(result.events[0]?.type, "complaint")
  assert.equal(result.events[0]?.recipientEmail, "ses@example.com")
})
