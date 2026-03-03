export type EmailTemplateCategory = "auth" | "transactional" | "marketing" | "support" | "billing"

export interface EmailTemplateContext {
  recipientName?: string
  appName?: string
  companyName?: string
  supportEmail?: string
  baseUrl?: string
  [key: string]: unknown
}

export interface EmailTemplateDefinition {
  id: string
  category: EmailTemplateCategory
  name: string
  subject: (context: EmailTemplateContext) => string
  previewText: string
  renderHtml: (context: EmailTemplateContext) => string
  renderText?: (context: EmailTemplateContext) => string
}

export interface RenderedEmailTemplate {
  id: string
  category: EmailTemplateCategory
  subject: string
  html: string
  text: string
}
