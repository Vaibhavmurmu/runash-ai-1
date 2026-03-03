import {
  completeMarketingWorkflowRun,
  createMarketingWorkflowRun,
  listMarketingWorkflowRules,
  type MarketingTriggerType,
} from "@/lib/repositories/marketing-workflows"
import { dispatchMarketingChannels } from "@/lib/marketing-workflows/channel-dispatcher"

export type MarketingTriggerEvent = {
  sellerUserId: string
  type: MarketingTriggerType
  recipientUserId: string
  recipientEmail?: string
  payload: Record<string, unknown>
}

function matchesConditions(conditions: Record<string, unknown>, payload: Record<string, unknown>) {
  const minIntentScore = Number(conditions.minIntentScore ?? 0)
  const minOrderCount = Number(conditions.minOrderCount ?? 0)

  if (typeof payload.intentScore === "number" && payload.intentScore < minIntentScore) return false
  if (typeof payload.orderCount === "number" && payload.orderCount < minOrderCount) return false

  return true
}

export async function processMarketingTrigger(event: MarketingTriggerEvent): Promise<{ processed: number }> {
  const rules = await listMarketingWorkflowRules(event.sellerUserId)
  const eligibleRules = rules.filter((rule) => rule.is_active && rule.trigger_type === event.type)

  let processed = 0
  for (const rule of eligibleRules) {
    if (!matchesConditions(rule.conditions ?? {}, event.payload ?? {})) {
      continue
    }

    const run = await createMarketingWorkflowRun({
      rule_id: rule.id,
      seller_user_id: event.sellerUserId,
      trigger_type: event.type,
      trigger_payload: event.payload,
    })

    if (!run) continue

    try {
      const subject = `Campaign: ${rule.name}`
      const message = typeof event.payload.message === "string" ? event.payload.message : "RunAsh marketing workflow delivered."
      const channelResults = await dispatchMarketingChannels(rule.channels, {
        sellerUserId: event.sellerUserId,
        recipientUserId: event.recipientUserId,
        recipientEmail: event.recipientEmail,
        subject,
        message,
        metadata: {
          trigger_type: event.type,
          workflow_rule_id: rule.id,
        },
      })

      await completeMarketingWorkflowRun(run.id, "completed", { channel_results: channelResults })
      processed += 1
    } catch (error) {
      await completeMarketingWorkflowRun(run.id, "failed", {
        error_message: error instanceof Error ? error.message : "unknown_error",
      })
    }
  }

  return { processed }
}
