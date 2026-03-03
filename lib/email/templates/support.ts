import { renderBaseLayout } from "./layout"
import { renderSummaryTable } from "./partials"
import type { EmailTemplateDefinition } from "./types"
import { withDefaults } from "./utils"

export const supportTemplates: EmailTemplateDefinition[] = [
  {
    id: "contact-acknowledgement",
    category: "support",
    name: "Contact Acknowledgement",
    previewText: "We received your message.",
    subject: () => "We received your support request",
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      return renderBaseLayout({
        ...c,
        previewText: "We received your message.",
        body: `<h1>Thanks for contacting us</h1><p>Your request has been logged and our team will get back to you shortly.</p>${renderSummaryTable([
          { label: "Ticket ID", value: String(c.ticketId ?? "pending") },
          { label: "Priority", value: String(c.priority ?? "Normal") },
        ])}`,
      })
    },
  },
  {
    id: "contact-internal-notification",
    category: "support",
    name: "Contact Internal Notification",
    previewText: "New contact form submission.",
    subject: () => "New contact request received",
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      return renderBaseLayout({
        ...c,
        previewText: "New contact form submission.",
        body: `<h1>New contact submission</h1>${renderSummaryTable([
          { label: "From", value: String(c.fromEmail ?? "unknown") },
          { label: "Topic", value: String(c.topic ?? "General") },
          { label: "Assigned", value: String(c.assignee ?? "Unassigned") },
        ])}<p>${String(c.messageSnippet ?? "")}</p>`,
      })
    },
  },
  {
    id: "feedback-received",
    category: "support",
    name: "Feedback Received",
    previewText: "Thanks for sharing your feedback.",
    subject: () => "Feedback received — thank you",
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      return renderBaseLayout({
        ...c,
        previewText: "Thanks for sharing your feedback.",
        body: `<h1>We got your feedback</h1><p>Thanks for helping us improve ${c.appName}.</p><p style="background:#f9fafb;padding:12px;border-radius:8px;">${String(c.feedbackExcerpt ?? "")}</p>`,
      })
    },
  },
  {
    id: "feedback-internal-triage",
    category: "support",
    name: "Feedback Internal Triage",
    previewText: "New feedback is ready for triage.",
    subject: () => "New feedback requires triage",
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      return renderBaseLayout({
        ...c,
        previewText: "New feedback is ready for triage.",
        body: `<h1>Feedback triage notice</h1>${renderSummaryTable([
          { label: "Severity", value: String(c.severity ?? "medium") },
          { label: "Area", value: String(c.productArea ?? "platform") },
          { label: "Reporter", value: String(c.reporter ?? "anonymous") },
        ])}`,
      })
    },
  },
]
