import { one, queryMany, sql } from "@/lib/db"

export type MarketingTriggerType = "stream_ended" | "cart_abandoned" | "high_intent_viewer" | "repeat_buyer"
export type MarketingChannel = "email" | "push" | "chat"

export type MarketingWorkflowTemplate = {
  id: string
  seller_user_id: string | null
  name: string
  description: string | null
  preset_key: string | null
  channels: MarketingChannel[]
  content: Record<string, unknown>
  is_system: boolean
}

export type MarketingWorkflowRule = {
  id: string
  seller_user_id: string
  name: string
  trigger_type: MarketingTriggerType
  template_id: string | null
  conditions: Record<string, unknown>
  channels: MarketingChannel[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type MarketingWorkflowRun = {
  id: string
  rule_id: string
  seller_user_id: string
  trigger_type: MarketingTriggerType
  status: "running" | "completed" | "failed"
  trigger_payload: Record<string, unknown>
  channel_results: Record<string, unknown> | null
  error_message: string | null
  started_at: string
  completed_at: string | null
}

export const SYSTEM_WORKFLOW_PRESETS: Array<Omit<MarketingWorkflowTemplate, "id">> = [
  {
    seller_user_id: null,
    name: "Welcome Journey",
    description: "Welcome new viewers with follow-up recommendations.",
    preset_key: "welcome",
    channels: ["chat", "push"],
    content: {
      subject: "Welcome to our live storefront",
      message: "Thanks for joining. Reply in chat for bundle recommendations.",
    },
    is_system: true,
  },
  {
    seller_user_id: null,
    name: "Promo Blast",
    description: "Promote limited-time offers to engaged audience segments.",
    preset_key: "promo",
    channels: ["email", "push"],
    content: {
      subject: "Flash offer just for you",
      message: "Your watched products are now on promo for the next 2 hours.",
    },
    is_system: true,
  },
  {
    seller_user_id: null,
    name: "Recovery Reminder",
    description: "Recover abandoned carts with urgency nudges.",
    preset_key: "recovery",
    channels: ["email", "chat"],
    content: {
      subject: "Your cart is waiting",
      message: "Checkout now and claim your reserved items before stock runs out.",
    },
    is_system: true,
  },
  {
    seller_user_id: null,
    name: "Smart Upsell",
    description: "Upsell repeat buyers with personalized add-ons.",
    preset_key: "upsell",
    channels: ["email", "push", "chat"],
    content: {
      subject: "Recommended add-ons for your next order",
      message: "Customers like you are adding this bundle at checkout.",
    },
    is_system: true,
  },
]

export async function listMarketingWorkflowTemplates(sellerUserId: string) {
  try {
    const rows = await queryMany<MarketingWorkflowTemplate>(
      `select * from marketing_workflow_templates
       where is_system=true or seller_user_id=$1
       order by is_system desc, created_at desc`,
      [sellerUserId],
    )

    if (rows.length > 0) return rows
  } catch {
    return SYSTEM_WORKFLOW_PRESETS.map((preset, index) => ({
      ...preset,
      id: `system-${index + 1}`,
    }))
  }

  return SYSTEM_WORKFLOW_PRESETS.map((preset, index) => ({
    ...preset,
    id: `system-${index + 1}`,
  }))
}

export async function createMarketingWorkflowTemplate(
  sellerUserId: string,
  input: Partial<MarketingWorkflowTemplate>,
): Promise<MarketingWorkflowTemplate | null> {
  try {
    const rows = await sql<MarketingWorkflowTemplate[]>`
      insert into marketing_workflow_templates (seller_user_id, name, description, preset_key, channels, content, is_system)
      values (
        ${sellerUserId},
        ${input.name ?? "Untitled Campaign"},
        ${input.description ?? null},
        ${input.preset_key ?? null},
        ${JSON.stringify(input.channels ?? ["email"])},
        ${JSON.stringify(input.content ?? {})},
        false
      )
      returning *
    `

    return rows[0] ?? null
  } catch {
    return null
  }
}

export async function listMarketingWorkflowRules(sellerUserId: string): Promise<MarketingWorkflowRule[]> {
  try {
    return queryMany<MarketingWorkflowRule>(
      `select * from marketing_workflow_rules where seller_user_id=$1 order by created_at desc`,
      [sellerUserId],
    )
  } catch {
    return []
  }
}

export async function getMarketingWorkflowRule(ruleId: string, sellerUserId: string): Promise<MarketingWorkflowRule | null> {
  return one<MarketingWorkflowRule>(
    sql<MarketingWorkflowRule[]>`select * from marketing_workflow_rules where id=${ruleId} and seller_user_id=${sellerUserId} limit 1`,
  )
}

export async function createMarketingWorkflowRule(
  sellerUserId: string,
  input: Partial<MarketingWorkflowRule>,
): Promise<MarketingWorkflowRule | null> {
  try {
    const rows = await sql<MarketingWorkflowRule[]>`
      insert into marketing_workflow_rules (seller_user_id, name, trigger_type, template_id, conditions, channels, is_active)
      values (
        ${sellerUserId},
        ${input.name ?? "Untitled Workflow"},
        ${(input.trigger_type as MarketingTriggerType) ?? "cart_abandoned"},
        ${input.template_id ?? null},
        ${JSON.stringify(input.conditions ?? {})},
        ${JSON.stringify(input.channels ?? ["email"])},
        ${input.is_active ?? false}
      )
      returning *
    `

    return rows[0] ?? null
  } catch {
    return null
  }
}

export async function updateMarketingWorkflowRule(
  ruleId: string,
  sellerUserId: string,
  input: Partial<MarketingWorkflowRule>,
): Promise<MarketingWorkflowRule | null> {
  const current = await getMarketingWorkflowRule(ruleId, sellerUserId)
  if (!current) return null

  const rows = await sql<MarketingWorkflowRule[]>`
    update marketing_workflow_rules
    set
      name=${input.name ?? current.name},
      trigger_type=${(input.trigger_type as MarketingTriggerType) ?? current.trigger_type},
      template_id=${input.template_id ?? current.template_id},
      conditions=${JSON.stringify(input.conditions ?? current.conditions)},
      channels=${JSON.stringify(input.channels ?? current.channels)},
      is_active=${input.is_active ?? current.is_active},
      updated_at=now()
    where id=${ruleId} and seller_user_id=${sellerUserId}
    returning *
  `

  return rows[0] ?? null
}

export async function setMarketingWorkflowRuleActivation(ruleId: string, sellerUserId: string, isActive: boolean) {
  return updateMarketingWorkflowRule(ruleId, sellerUserId, { is_active: isActive })
}

export async function deleteMarketingWorkflowRule(ruleId: string, sellerUserId: string): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`
    delete from marketing_workflow_rules where id=${ruleId} and seller_user_id=${sellerUserId} returning id
  `
  return rows.length > 0
}

export async function createMarketingWorkflowRun(
  input: Pick<MarketingWorkflowRun, "rule_id" | "seller_user_id" | "trigger_type" | "trigger_payload">,
): Promise<MarketingWorkflowRun | null> {
  const rows = await sql<MarketingWorkflowRun[]>`
    insert into marketing_workflow_runs (rule_id, seller_user_id, trigger_type, trigger_payload)
    values (${input.rule_id}, ${input.seller_user_id}, ${input.trigger_type}, ${JSON.stringify(input.trigger_payload)})
    returning *
  `

  return rows[0] ?? null
}

export async function completeMarketingWorkflowRun(
  runId: string,
  status: "completed" | "failed",
  result: { channel_results?: Record<string, unknown>; error_message?: string },
): Promise<void> {
  await sql`
    update marketing_workflow_runs
    set
      status=${status},
      channel_results=${JSON.stringify(result.channel_results ?? {})},
      error_message=${result.error_message ?? null},
      completed_at=now()
    where id=${runId}
  `
}

export async function listMarketingWorkflowRuns(sellerUserId: string, limit = 40): Promise<MarketingWorkflowRun[]> {
  try {
    return queryMany<MarketingWorkflowRun>(
      `select * from marketing_workflow_runs where seller_user_id=$1 order by started_at desc limit $2`,
      [sellerUserId, limit],
    )
  } catch {
    return []
  }
}
