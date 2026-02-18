import type { ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

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
  component: (props: BroadcastTemplateProps, context: BroadcastRenderContext) => ReactElement
}

const templateRegistry: BroadcastTemplateDefinition[] = [
  {
    key: "marketing.announcement",
    label: "Announcement",
    description: "General campaign update with CTA",
    component: (props, context) => {
      const heading = String(props.heading || context.subject)
      const body = String(props.body || "We have an update to share.")
      const ctaLabel = String(props.ctaLabel || "Learn more")
      const ctaUrl = String(props.ctaUrl || process.env.NEXT_PUBLIC_APP_URL || "https://runash.in")

      return (
        <html>
          <body style={{ margin: 0, padding: 0, fontFamily: "Arial, sans-serif", backgroundColor: "#f6f7fb" }}>
            <table width="100%" cellPadding={0} cellSpacing={0} style={{ padding: "24px 0" }}>
              <tbody>
                <tr>
                  <td align="center">
                    <table width="640" cellPadding={0} cellSpacing={0} style={{ backgroundColor: "#fff", borderRadius: 12, overflow: "hidden" }}>
                      <tbody>
                        <tr>
                          <td style={{ background: "linear-gradient(90deg,#ff7a18,#ff5100)", color: "#fff", padding: 24, fontSize: 24, fontWeight: 700 }}>{heading}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: 24, color: "#1f2937", lineHeight: 1.6 }}>
                            <p style={{ marginTop: 0 }}>Hi {context.recipient?.name || "there"},</p>
                            <p>{body}</p>
                            <p style={{ margin: "24px 0" }}>
                              <a href={ctaUrl} style={{ backgroundColor: "#ff5a1f", color: "#fff", textDecoration: "none", padding: "10px 16px", borderRadius: 8, display: "inline-block" }}>
                                {ctaLabel}
                              </a>
                            </p>
                            <p style={{ color: "#6b7280", fontSize: 13 }}>You are receiving this email because you subscribed to updates from RunAsh.</p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      )
    },
  },
  {
    key: "marketing.product-update",
    label: "Product update",
    description: "Feature highlight with bullet points",
    component: (props, context) => {
      const title = String(props.title || "New features available")
      const highlights = Array.isArray(props.highlights)
        ? props.highlights.map((item) => String(item))
        : ["Improved seller dashboard", "Faster checkout flows", "Broadcast automation"]

      return (
        <html>
          <body style={{ margin: 0, padding: "16px", fontFamily: "Arial, sans-serif", color: "#111827" }}>
            <div style={{ maxWidth: 620, margin: "0 auto", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24 }}>
              <h1 style={{ marginTop: 0 }}>{title}</h1>
              <p>{context.preheader || "Latest RunAsh updates"}</p>
              <ul>
                {highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </div>
          </body>
        </html>
      )
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

  const html = `<!DOCTYPE html>${renderToStaticMarkup(template.component(input.props, input.context))}`
  const text = stripHtml(html)

  return {
    html,
    text,
    templateLabel: template.label,
  }
}
