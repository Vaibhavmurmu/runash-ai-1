import { renderBaseLayout } from "./layout"
import { renderCta } from "./partials"
import type { EmailTemplateDefinition } from "./types"
import { withDefaults } from "./utils"

export const authTemplates: EmailTemplateDefinition[] = [
  {
    id: "verify-email",
    category: "auth",
    name: "Verify Email",
    previewText: "Confirm your email address to secure your account.",
    subject: (ctx) => `Verify your ${withDefaults(ctx).appName} email`,
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      const verifyUrl = String(c.verifyUrl ?? `${c.baseUrl}/verify-email`)
      return renderBaseLayout({
        ...c,
        previewText: "Confirm your email address to secure your account.",
        body: `<h1>Verify your email</h1><p>Hi ${c.recipientName ?? "there"}, please verify your email to complete signup.</p><p>${renderCta("Verify email", verifyUrl)}</p>`,
      })
    },
  },
  {
    id: "welcome",
    category: "auth",
    name: "Welcome",
    previewText: "Welcome to RunAsh. Let’s get started.",
    subject: (ctx) => `Welcome to ${withDefaults(ctx).appName}`,
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      const dashboardUrl = String(c.dashboardUrl ?? `${c.baseUrl}/account`)
      return renderBaseLayout({
        ...c,
        previewText: "Welcome to RunAsh. Let’s get started.",
        body: `<h1>Welcome aboard</h1><p>We’re excited to have you, ${c.recipientName ?? "creator"}.</p><p>${renderCta("Open dashboard", dashboardUrl)}</p>`,
      })
    },
  },
  {
    id: "password-reset",
    category: "auth",
    name: "Password Reset",
    previewText: "Reset your password securely.",
    subject: (ctx) => `${withDefaults(ctx).appName} password reset`,
    renderHtml: (ctx) => {
      const c = withDefaults(ctx)
      const resetUrl = String(c.resetUrl ?? `${c.baseUrl}/reset-password`)
      return renderBaseLayout({
        ...c,
        previewText: "Reset your password securely.",
        body: `<h1>Reset password</h1><p>Use the secure link below to set a new password.</p><p>${renderCta("Reset password", resetUrl)}</p><p style="color:#6b7280;font-size:14px;">If you didn’t request this, you can ignore this email.</p>`,
      })
    },
  },
]
