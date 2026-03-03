import { renderBaseLayout } from "./layout"
import { renderCta } from "./partials"
import type { EmailTemplateDefinition } from "./types"
import { withDefaults } from "./utils"

export const transactionalTemplates: EmailTemplateDefinition[] = [
  {
    id: "referral-invite",
    category: "transactional",
    name: "Referral Invite",
    previewText: "You have been invited to try RunAsh.",
    subject: () => "You’ve been invited to RunAsh",
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      return renderBaseLayout({
        ...c,
        previewText: "You have been invited to try RunAsh.",
        body: `<h1>You’re invited</h1><p>${String(c.inviterName ?? "A teammate")} invited you to join ${c.appName}.</p><p>${renderCta("Accept invite", String(c.inviteUrl ?? c.baseUrl))}</p>`,
      })
    },
  },
  {
    id: "referral-success",
    category: "transactional",
    name: "Referral Success",
    previewText: "Your referral reward has been unlocked.",
    subject: () => "Referral success 🎉",
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      return renderBaseLayout({
        ...c,
        previewText: "Your referral reward has been unlocked.",
        body: `<h1>Referral complete</h1><p>Great news — your referral converted successfully.</p><p>Reward: <strong>${String(c.reward ?? "Credits added")}</strong></p>`,
      })
    },
  },
  {
    id: "upgrade-prompt",
    category: "transactional",
    name: "Upgrade Prompt",
    previewText: "Unlock additional limits and premium tools.",
    subject: () => "Ready to upgrade?",
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      return renderBaseLayout({
        ...c,
        previewText: "Unlock additional limits and premium tools.",
        body: `<h1>Upgrade for more power</h1><p>You’re close to your current plan limits.</p><p>${renderCta("View plans", String(c.pricingUrl ?? `${c.baseUrl}/pricing`))}</p>`,
      })
    },
  },
  {
    id: "upgrade-success",
    category: "transactional",
    name: "Upgrade Success",
    previewText: "Your plan has been upgraded.",
    subject: () => "Upgrade successful",
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      return renderBaseLayout({
        ...c,
        previewText: "Your plan has been upgraded.",
        body: `<h1>Plan updated</h1><p>Your account is now on <strong>${String(c.newPlan ?? "Pro")}</strong>.</p><p>${renderCta("Explore features", String(c.dashboardUrl ?? `${c.baseUrl}/account`))}</p>`,
      })
    },
  },
]
