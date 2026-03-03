import { renderBaseLayout } from "./layout"
import { renderCta } from "./partials"
import type { EmailTemplateDefinition } from "./types"
import { withDefaults } from "./utils"

export const marketingTemplates: EmailTemplateDefinition[] = [
  {
    id: "newsletter-confirmation",
    category: "marketing",
    name: "Newsletter Confirmation",
    previewText: "Confirm your newsletter subscription.",
    subject: () => "Confirm your newsletter subscription",
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      const confirmationUrl = String(c.confirmationUrl ?? `${c.baseUrl}/newsletter/confirm`)
      return renderBaseLayout({
        ...c,
        previewText: "Confirm your newsletter subscription.",
        body: `<h1>One click to confirm</h1><p>Please confirm to start receiving product and growth updates.</p><p>${renderCta("Confirm subscription", confirmationUrl)}</p>`,
      })
    },
  },
  {
    id: "campaign-send-shell",
    category: "marketing",
    name: "Campaign Send Shell",
    previewText: "Campaign skeleton template for marketing sends.",
    subject: (ctx) => String(withDefaults(ctx).campaignSubject ?? "RunAsh campaign update"),
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      return renderBaseLayout({
        ...c,
        previewText: "Campaign skeleton template for marketing sends.",
        body: `<h1>${String(c.headline ?? "Campaign headline")}</h1><p>${String(c.bodyCopy ?? "Campaign body copy goes here.")}</p><p>${renderCta(String(c.ctaLabel ?? "Learn more"), String(c.ctaUrl ?? c.baseUrl))}</p>`,
      })
    },
  },
]
