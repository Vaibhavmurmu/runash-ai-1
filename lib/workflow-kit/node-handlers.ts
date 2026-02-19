import { WorkflowNode } from "@/types/workflow-kit"

export type NodeHandler<Input extends Record<string, unknown> = Record<string, unknown>, Output extends Record<string, unknown> = Record<string, unknown>> = (
  node: WorkflowNode,
  input: Input,
) => Promise<Output>

export type NodeRollbackHandler = (node: WorkflowNode, output: Record<string, unknown>) => Promise<string>

interface EmailBroadcastInput {
  segmentId?: string
  dryRun?: boolean
}

interface EmailBroadcastOutput {
  action: "email.send_broadcast"
  campaignId: string
  queuedRecipients: number
  provider: string
  rollbackToken: string
}

interface EmailTestInput {
  to?: string
}

interface EmailTestOutput {
  action: "email.send_test"
  messageId: string
  provider: string
  accepted: boolean
}

interface EmailImportContactsInput {
  sourceFileUrl?: string
}

interface EmailImportContactsOutput {
  action: "email.import_contacts"
  listName: string
  imported: number
  duplicatesSkipped: number
}

interface EmailInboundReplyInput {
  payload?: {
    from?: string
    text?: string
  }
}

interface EmailInboundReplyOutput {
  action: "email.handle_inbound_reply"
  priority: "low" | "medium" | "high"
  intent: "sales" | "support" | "unsubscribe" | "unknown"
  agentTaskId?: string
}

interface EmailWebhookEventTriggerOutput {
  action: "email.webhook_event_trigger"
  eventType: string
  provider: string
  receivedAt: string
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const passthrough: NodeHandler = async (node, input) => {
  await sleep(200)
  return { ...input, lastProcessedBy: node.type }
}

const emailBroadcastHandler: NodeHandler<EmailBroadcastInput, EmailBroadcastOutput> = async (node, input) => {
  await sleep(160)
  const audienceId = typeof node.config.audienceId === "string" ? node.config.audienceId : "all-active"
  const dryRun = Boolean(input.dryRun ?? node.config.dryRun)

  return {
    action: "email.send_broadcast",
    campaignId: `cmp-${node.id}-${Date.now()}`,
    queuedRecipients: dryRun ? 0 : audienceId === "all-active" ? 250 : 48,
    provider: typeof node.config.provider === "string" ? node.config.provider : "resend",
    rollbackToken: `rb-${node.id}-${Date.now()}`,
  }
}

const emailTestHandler: NodeHandler<EmailTestInput, EmailTestOutput> = async (node, input) => {
  await sleep(120)
  const to = input.to ?? (typeof node.config.to === "string" ? node.config.to : "test@runash.ai")
  return {
    action: "email.send_test",
    messageId: `test-${node.id}-${Date.now()}`,
    provider: typeof node.config.provider === "string" ? node.config.provider : "resend",
    accepted: to.length > 0,
  }
}

const emailImportContactsHandler: NodeHandler<EmailImportContactsInput, EmailImportContactsOutput> = async (node, input) => {
  await sleep(200)
  const sourceFileUrl = input.sourceFileUrl ?? node.config.source
  const imported = typeof sourceFileUrl === "string" && sourceFileUrl.length > 0 ? 140 : 60
  return {
    action: "email.import_contacts",
    listName: typeof node.config.listName === "string" ? node.config.listName : "newsletter",
    imported,
    duplicatesSkipped: Math.round(imported * 0.1),
  }
}

const emailInboundReplyHandler: NodeHandler<EmailInboundReplyInput, EmailInboundReplyOutput> = async (node, input) => {
  await sleep(220)
  const body = input.payload?.text?.toLowerCase() ?? ""
  const intent: EmailInboundReplyOutput["intent"] = body.includes("unsubscribe")
    ? "unsubscribe"
    : body.includes("price") || body.includes("buy")
      ? "sales"
      : body.includes("help")
        ? "support"
        : "unknown"

  const priority: EmailInboundReplyOutput["priority"] = intent === "sales" ? "high" : intent === "support" ? "medium" : "low"
  const assignToAgent = node.config.assignToAgent !== false

  return {
    action: "email.handle_inbound_reply",
    priority,
    intent,
    agentTaskId: assignToAgent ? `agent-task-${node.id}-${Date.now()}` : undefined,
  }
}

const emailWebhookEventTriggerHandler: NodeHandler<Record<string, never>, EmailWebhookEventTriggerOutput> = async (node) => {
  await sleep(80)
  return {
    action: "email.webhook_event_trigger",
    eventType: typeof node.config.eventType === "string" ? node.config.eventType : "delivered",
    provider: typeof node.config.provider === "string" ? node.config.provider : "resend",
    receivedAt: new Date().toISOString(),
  }
}

export const NODE_HANDLERS: Record<string, NodeHandler> = {
  "camera-input": async (node) => {
    await sleep(150)
    return { videoFrame: `${node.id}:video`, audioFrame: `${node.id}:audio` }
  },
  "stream-key-input": async (node) => {
    await sleep(120)
    return { videoFrame: `${node.id}:ingest-video`, audioFrame: `${node.id}:ingest-audio` }
  },
  "video-trim": passthrough,
  "video-overlay": passthrough,
  "ai-enhancer": async (_node, input) => {
    await sleep(300)
    return { ...input, enhancements: ["denoise", "low-light"] }
  },
  "ai-caption": async (_node, input) => {
    await sleep(280)
    return { ...input, captions: [{ time: 0, text: "Welcome to the live stream" }] }
  },
  "multi-stream": async (_node, input) => {
    await sleep(180)
    return {
      ...input,
      streamEvents: [
        { platform: "youtube", viewers: 120 },
        { platform: "twitch", viewers: 48 },
      ],
    }
  },
  "stream-analytics": async (_node, input) => {
    await sleep(220)
    return {
      kpis: {
        concurrentViewers: 168,
        averageWatchTime: 452,
        chatRate: 22,
      },
      input,
    }
  },
  "record-output": async (_node, input) => {
    await sleep(100)
    return { saved: true, artifactId: `recording-${Date.now()}`, input }
  },
  "email.send_broadcast": emailBroadcastHandler as NodeHandler,
  "email.send_test": emailTestHandler as NodeHandler,
  "email.import_contacts": emailImportContactsHandler as NodeHandler,
  "email.handle_inbound_reply": emailInboundReplyHandler as NodeHandler,
  "email.webhook_event_trigger": emailWebhookEventTriggerHandler as NodeHandler,
}

export const NODE_ROLLBACK_HANDLERS: Record<string, NodeRollbackHandler> = {
  "email.send_broadcast": async (_node, output) => {
    await sleep(80)
    const token = typeof output.rollbackToken === "string" ? output.rollbackToken : "missing-token"
    return `Broadcast cancelled (${token})`
  },
  "email.import_contacts": async (_node, output) => {
    await sleep(70)
    return `Imported contacts reverted (${String(output.listName ?? "unknown-list")})`
  },
}

export function getNodeHandler(type: string): NodeHandler {
  return NODE_HANDLERS[type] ?? passthrough
}

export function getNodeRollbackHandler(type: string): NodeRollbackHandler | null {
  return NODE_ROLLBACK_HANDLERS[type] ?? null
}
