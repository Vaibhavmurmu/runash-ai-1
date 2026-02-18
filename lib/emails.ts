import { type EmailAttachment, sendWithEmailProvider } from "./email-provider"

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

  return sendWithEmailProvider({
    to,
    subject,
    text,
    html: reportHtml,
    headers,
    attachments,
  })
}
