type Primitive = string | number | boolean | null

export type BroadcastTemplateProps = Record<string, Primitive | Primitive[] | Record<string, Primitive>>

export interface BroadcastRenderContext {
  subject: string
  preheader?: string | null
  recipient?: {
    email: string
    name?: string | null
  }
}

interface BroadcastTemplateDefinition {
  key: string
  label: string
  description: string
  render: (props: BroadcastTemplateProps, context: BroadcastRenderContext) => string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

const templateRegistry: BroadcastTemplateDefinition[] = [
  {
    key: "marketing.announcement",
    label: "Announcement",
    description: "General campaign update with CTA",
    render: (props, context) => {
      const heading = escapeHtml(String(props.heading || context.subject))
      const body = escapeHtml(String(props.body || "We have an update to share."))
      const ctaLabel = escapeHtml(String(props.ctaLabel || "Learn more"))
      const ctaUrl = escapeHtml(String(props.ctaUrl || process.env.NEXT_PUBLIC_APP_URL || "https://runash.in"))
      const recipientName = escapeHtml(String(context.recipient?.name || "there"))

      return `
<html>
  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f6f7fb;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
      <tbody>
        <tr>
          <td align="center">
            <table width="640" cellpadding="0" cellspacing="0" style="background-color:#fff;border-radius:12px;overflow:hidden;">
              <tbody>
                <tr>
                  <td style="background:linear-gradient(90deg,#ff7a18,#ff5100);color:#fff;padding:24px;font-size:24px;font-weight:700;">${heading}</td>
                </tr>
                <tr>
                  <td style="padding:24px;color:#1f2937;line-height:1.6;">
                    <p style="margin-top:0;">Hi ${recipientName},</p>
                    <p>${body}</p>
                    <p style="margin:24px 0;">
                      <a href="${ctaUrl}" style="background-color:#ff5a1f;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">${ctaLabel}</a>
                    </p>
                    <p style="color:#6b7280;font-size:13px;">You are receiving this email because you subscribed to updates from RunAsh.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`.trim()
    },
  },
  {
    key: "marketing.product-update",
    label: "Product update",
    description: "Feature highlight with bullet points",
    render: (props, context) => {
      const title = escapeHtml(String(props.title || "New features available"))
      const preheader = escapeHtml(String(context.preheader || "Latest RunAsh updates"))
      const highlights = Array.isArray(props.highlights)
        ? props.highlights.map((item) => escapeHtml(String(item)))
        : ["Improved seller dashboard", "Faster checkout flows", "Broadcast automation"].map(escapeHtml)

      const highlightsHtml = highlights.map((highlight) => `<li>${highlight}</li>`).join("")

      return `
<html>
  <body style="margin:0;padding:16px;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:620px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
      <h1 style="margin-top:0;">${title}</h1>
      <p>${preheader}</p>
      <ul>${highlightsHtml}</ul>
    </div>
  </body>
</html>`.trim()
    },
  },
]

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function listBroadcastTemplates() {
  return templateRegistry.map(({ key, label, description }) => ({ key, label, description }))
}

export function renderBroadcastTemplate(input: {
  templateKey: string
  props: BroadcastTemplateProps
  context: BroadcastRenderContext
}) {
  const template = templateRegistry.find((entry) => entry.key === input.templateKey)
  if (!template) {
    throw new Error("Unsupported broadcast template key")
  }

  const html = `<!DOCTYPE html>${template.render(input.props, input.context)}`
  const text = stripHtml(html)

  return {
    html,
    text,
    templateLabel: template.label,
  }
}
