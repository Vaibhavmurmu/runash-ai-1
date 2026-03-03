import { type EmailAttachment } from "./email-provider"
import { applyEmailSafetyPolicy } from "./email"
import { sendEmailEvent } from "@/services/email"

export async function sendReportEmail({
  to,
  subject,
  text,
  html,
  headers,
  attachments,
}: {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  headers?: Record<string, string>
  attachments?: EmailAttachment[]
}) {
  const reportHtml =
    html ??
    `<div>
      <p>${text ?? "Your scheduled report is attached."}</p>
    </div>`

  const safeDelivery = applyEmailSafetyPolicy(to)
  const recipient = safeDelivery.recipients.length === 1 ? safeDelivery.recipients[0] : safeDelivery.recipients

  if (safeDelivery.config.dryRun) {
    return {
      success: true,
      simulated: true,
      to: recipient,
    }
  }

  return sendEmailEvent({
    type: "GENERIC_EMAIL",
    to: recipient,
    source: "lib/emails.sendReportEmail",
    metadata: {
      category: "report",
      headers,
    },
    payload: {
      subject,
      text,
      html: reportHtml,
      attachments,
      track_delivery: false,
    },
  })
}
