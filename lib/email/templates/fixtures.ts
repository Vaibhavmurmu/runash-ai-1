import { listEmailTemplates, renderEmailTemplate } from "./index"
import type { EmailTemplateContext } from "./types"

export const emailTemplatePreviewFixtures: Record<string, EmailTemplateContext> = {
  "verify-email": { recipientName: "Ari", verifyUrl: "https://runash.in/verify?t=abc" },
  welcome: { recipientName: "Ari" },
  "password-reset": { resetUrl: "https://runash.in/reset?t=abc" },
  "contact-acknowledgement": { ticketId: "SUP-2042", priority: "High" },
  "contact-internal-notification": { fromEmail: "user@example.com", topic: "Billing", assignee: "Ops", messageSnippet: "Charge mismatch" },
  "newsletter-confirmation": { confirmationUrl: "https://runash.in/newsletter/confirm?t=abc" },
  "campaign-send-shell": { campaignSubject: "February product update", headline: "New launches", bodyCopy: "This month we shipped...", ctaLabel: "Read changelog", ctaUrl: "https://runash.in/changelog" },
  "feedback-received": { feedbackExcerpt: "The live commerce dashboard is great." },
  "feedback-internal-triage": { severity: "high", productArea: "checkout", reporter: "merchant-14" },
  "referral-invite": { inviterName: "Taylor", inviteUrl: "https://runash.in/invite/xyz" },
  "referral-success": { reward: "$50 credit" },
  "upgrade-prompt": { pricingUrl: "https://runash.in/pricing" },
  "upgrade-success": { newPlan: "Business" },
  "billing-receipt": { amount: 89, currency: "USD", receiptId: "rcpt_9912" },
  "payment-failed": { billingUrl: "https://runash.in/billing" },
  "invoice-ready": { invoiceUrl: "https://runash.in/billing/invoices/inv_22" },
  "subscription-started": { planName: "Pro" },
  "trial-ending": { trialEndsOn: "2026-03-15" },
  "subscription-renewal": { nextRenewalDate: "2026-04-01" },
  "subscription-cancellation": { accessUntil: "2026-03-30" },
}

export function buildEmailTemplatePreviews() {
  return listEmailTemplates().map((template) => {
    const fixture = emailTemplatePreviewFixtures[template.id] ?? {}
    return {
      id: template.id,
      category: template.category,
      subject: template.subject(fixture),
      preview: renderEmailTemplate(template.id, fixture),
    }
  })
}
