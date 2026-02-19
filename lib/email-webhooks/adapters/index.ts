import { normalizeGenericWebhook } from "@/lib/email-webhooks/adapters/generic"
import { normalizeResendWebhook } from "@/lib/email-webhooks/adapters/resend"
import { normalizeSendgridWebhook } from "@/lib/email-webhooks/adapters/sendgrid"
import { normalizeSesWebhook } from "@/lib/email-webhooks/adapters/ses"
import { type EmailWebhookProvider, type ProviderNormalizationResult } from "@/lib/email-webhooks/types"

export function normalizeProviderWebhook(provider: EmailWebhookProvider, payload: Record<string, any>): ProviderNormalizationResult {
  switch (provider) {
    case "resend":
      return normalizeResendWebhook(payload)
    case "sendgrid":
      return normalizeSendgridWebhook(payload)
    case "ses":
      return normalizeSesWebhook(payload)
    case "generic":
      return normalizeGenericWebhook(payload)
    default:
      return normalizeGenericWebhook(payload)
  }
}
