import { sendEmail } from "@/lib/email"
import { NotificationService } from "@/lib/services/notification-service"
import type { MarketingChannel } from "@/lib/repositories/marketing-workflows"

export type MarketingDispatchContext = {
  sellerUserId: string
  recipientUserId: string
  recipientEmail?: string
  subject: string
  message: string
  metadata?: Record<string, unknown>
}

export async function dispatchMarketingChannels(
  channels: MarketingChannel[],
  context: MarketingDispatchContext,
): Promise<Record<string, { delivered: boolean; reason?: string }>> {
  const results: Record<string, { delivered: boolean; reason?: string }> = {}

  for (const channel of channels) {
    if (channel === "email") {
      if (!context.recipientEmail) {
        results.email = { delivered: false, reason: "recipient_email_missing" }
        continue
      }

      await sendEmail({
        to: context.recipientEmail,
        subject: context.subject,
        html: `<p>${context.message}</p>`,
        text: context.message,
      })
      results.email = { delivered: true }
      continue
    }

    if (channel === "push") {
      const { error } = await NotificationService.createNotification({
        user_id: context.recipientUserId,
        title: context.subject,
        message: context.message,
        type: "marketing_push",
        metadata: {
          seller_user_id: context.sellerUserId,
          ...(context.metadata ?? {}),
        },
      })

      results.push = error ? { delivered: false, reason: "push_failed" } : { delivered: true }
      continue
    }

    if (channel === "chat") {
      const { error } = await NotificationService.createNotification({
        user_id: context.recipientUserId,
        title: `Chat: ${context.subject}`,
        message: context.message,
        type: "marketing_chat",
        metadata: {
          seller_user_id: context.sellerUserId,
          channel: "chat",
          ...(context.metadata ?? {}),
        },
      })

      results.chat = error ? { delivered: false, reason: "chat_dispatch_failed" } : { delivered: true }
    }
  }

  return results
}
