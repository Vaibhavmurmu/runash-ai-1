import type { EmailTemplateContext } from "./types"

export function withDefaults(context: EmailTemplateContext): Required<Pick<EmailTemplateContext, "appName" | "companyName" | "supportEmail" | "baseUrl">> &
  EmailTemplateContext {
  return {
    appName: "RunAsh",
    companyName: "RunAsh AI",
    supportEmail: "support@runash.in",
    baseUrl: "https://runash.in",
    ...context,
  }
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function formatCurrency(amount: unknown, currency = "USD"): string {
  const numericAmount = typeof amount === "number" ? amount : Number(amount ?? 0)
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(numericAmount)
}
