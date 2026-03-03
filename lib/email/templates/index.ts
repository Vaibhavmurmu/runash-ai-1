import { authTemplates } from "./auth"
import { billingTemplates } from "./billing"
import { marketingTemplates } from "./marketing"
import { supportTemplates } from "./support"
import { transactionalTemplates } from "./transactional"
import type { EmailTemplateCategory, EmailTemplateContext, EmailTemplateDefinition, RenderedEmailTemplate } from "./types"
import { htmlToPlainText } from "./utils"

export const emailTemplateCatalog: Record<EmailTemplateCategory, EmailTemplateDefinition[]> = {
  auth: authTemplates,
  transactional: transactionalTemplates,
  marketing: marketingTemplates,
  support: supportTemplates,
  billing: billingTemplates,
}

const allTemplates = Object.values(emailTemplateCatalog).flat()

export function listEmailTemplates(category?: EmailTemplateCategory): EmailTemplateDefinition[] {
  return category ? emailTemplateCatalog[category] : allTemplates
}

export function renderEmailTemplate(templateId: string, context: EmailTemplateContext = {}): RenderedEmailTemplate {
  const template = allTemplates.find((item) => item.id === templateId)
  if (!template) {
    throw new Error(`Unknown email template: ${templateId}`)
  }

  const html = template.renderHtml(context)
  const text = template.renderText?.(context) ?? htmlToPlainText(html)

  return {
    id: template.id,
    category: template.category,
    subject: template.subject(context),
    html,
    text,
  }
}
