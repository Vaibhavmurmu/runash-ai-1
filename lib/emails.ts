import { type EmailAttachment, sendWithEmailProvider } from "./email-provider"
import { applyEmailSafetyPolicy } from "./email"

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

  return sendWithEmailProvider({
    to: recipient,
    subject,
    text,
    html: reportHtml,
    headers,
    attachments,
  })
}
