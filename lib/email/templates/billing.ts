import { renderBaseLayout } from "./layout"
import { renderCta, renderSummaryTable } from "./partials"
import type { EmailTemplateDefinition } from "./types"
import { formatCurrency, withDefaults } from "./utils"

export const billingTemplates: EmailTemplateDefinition[] = [
  {
    id: "billing-receipt",
    category: "billing",
    name: "Billing Receipt",
    previewText: "Your payment receipt is ready.",
    subject: () => "Payment receipt",
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      return renderBaseLayout({
        ...c,
        previewText: "Your payment receipt is ready.",
        body: `<h1>Payment received</h1>${renderSummaryTable([
          { label: "Amount", value: formatCurrency(c.amount, String(c.currency ?? "USD")) },
          { label: "Receipt", value: String(c.receiptId ?? "N/A") },
        ])}`,
      })
    },
  },
  {
    id: "payment-failed",
    category: "billing",
    name: "Payment Failed",
    previewText: "We could not process your latest payment.",
    subject: () => "Payment failed",
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      return renderBaseLayout({
        ...c,
        previewText: "We could not process your latest payment.",
        body: `<h1>Payment failed</h1><p>Your payment method was declined.</p><p>${renderCta("Update payment method", String(c.billingUrl ?? `${c.baseUrl}/billing`))}</p>`,
      })
    },
  },
  {
    id: "invoice-ready",
    category: "billing",
    name: "Invoice Ready",
    previewText: "A new invoice is available.",
    subject: () => "Invoice ready",
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      return renderBaseLayout({ ...c, previewText: "A new invoice is available.", body: `<h1>Invoice available</h1><p>${renderCta("View invoice", String(c.invoiceUrl ?? `${c.baseUrl}/billing/invoices`))}</p>` })
    },
  },
  {
    id: "subscription-started",
    category: "billing",
    name: "Subscription Started",
    previewText: "Your subscription is now active.",
    subject: () => "Subscription started",
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      return renderBaseLayout({ ...c, previewText: "Your subscription is now active.", body: `<h1>Subscription active</h1><p>Plan: ${String(c.planName ?? "Starter")}</p>` })
    },
  },
  {
    id: "trial-ending",
    category: "billing",
    name: "Trial Ending",
    previewText: "Your trial is ending soon.",
    subject: () => "Trial ending soon",
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      return renderBaseLayout({ ...c, previewText: "Your trial is ending soon.", body: `<h1>Trial ending</h1><p>Your trial ends on ${String(c.trialEndsOn ?? "soon")}.</p><p>${renderCta("Choose a plan", String(c.pricingUrl ?? `${c.baseUrl}/pricing`))}</p>` })
    },
  },
  {
    id: "subscription-renewal",
    category: "billing",
    name: "Subscription Renewal",
    previewText: "Your subscription has renewed.",
    subject: () => "Subscription renewed",
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      return renderBaseLayout({ ...c, previewText: "Your subscription has renewed.", body: `<h1>Renewal successful</h1><p>Next renewal date: ${String(c.nextRenewalDate ?? "next cycle")}</p>` })
    },
  },
  {
    id: "subscription-cancellation",
    category: "billing",
    name: "Subscription Cancellation",
    previewText: "Your subscription has been cancelled.",
    subject: () => "Subscription cancelled",
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      return renderBaseLayout({ ...c, previewText: "Your subscription has been cancelled.", body: `<h1>Subscription cancelled</h1><p>Your access remains active until ${String(c.accessUntil ?? "period end")}.</p>` })
    },
  },
]
