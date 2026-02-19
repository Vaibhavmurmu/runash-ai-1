import { WorkflowTemplate } from "@/types/workflow-kit"

const now = new Date().toISOString()

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "template-live-commerce",
    name: "Live Commerce Booster",
    category: "live-commerce",
    description: "AI captions + product overlays + multi-platform broadcasting for shopping streams.",
    rating: 4.8,
    uses: 1240,
    graph: {
      name: "Live Commerce Booster",
      description: "Ready-to-run commerce workflow",
      trigger: { type: "manual" },
      nodes: [
        { id: "n1", type: "camera-input", name: "Camera", config: {}, position: { x: 80, y: 80 } },
        { id: "n2", type: "ai-caption", name: "Captions", config: {}, position: { x: 300, y: 80 } },
        { id: "n3", type: "video-overlay", name: "Product Overlay", config: {}, position: { x: 520, y: 80 } },
        { id: "n4", type: "multi-stream", name: "Broadcast", config: {}, position: { x: 760, y: 80 } },
      ],
      connections: [
        { id: "c1", sourceNodeId: "n1", sourcePortId: "video-out", targetNodeId: "n2", targetPortId: "video-in" },
        { id: "c2", sourceNodeId: "n2", sourcePortId: "video-out", targetNodeId: "n3", targetPortId: "video-in" },
        { id: "c3", sourceNodeId: "n3", sourcePortId: "video-out", targetNodeId: "n4", targetPortId: "video-in" },
      ],
    },
  },
  {
    id: "template-esports",
    name: "Esports Instant Replay",
    category: "gaming",
    description: "Overlay + AI enhancement + analytics tuned for competitive streams.",
    rating: 4.6,
    uses: 980,
    graph: {
      name: "Esports Instant Replay",
      trigger: { type: "manual" },
      nodes: [
        { id: "n1", type: "stream-key-input", name: "RTMP Ingest", config: {}, position: { x: 80, y: 140 } },
        { id: "n2", type: "ai-enhancer", name: "AI Enhance", config: {}, position: { x: 300, y: 140 } },
        { id: "n3", type: "multi-stream", name: "Broadcast", config: {}, position: { x: 520, y: 140 } },
        { id: "n4", type: "stream-analytics", name: "Metrics", config: {}, position: { x: 740, y: 140 } },
      ],
      connections: [
        { id: "c1", sourceNodeId: "n1", sourcePortId: "video-out", targetNodeId: "n2", targetPortId: "video-in" },
        { id: "c2", sourceNodeId: "n2", sourcePortId: "video-out", targetNodeId: "n3", targetPortId: "video-in" },
        { id: "c3", sourceNodeId: "n3", sourcePortId: "event-out", targetNodeId: "n4", targetPortId: "event-in" },
      ],
    },
  },
  {
    id: "template-email-welcome-sequence",
    name: "Email Welcome Sequence",
    category: "email-automation",
    description: "Scheduled welcome broadcast with a test gate before campaign launch.",
    rating: 4.9,
    uses: 321,
    graph: {
      name: "Email Welcome Sequence",
      trigger: { type: "schedule", scheduleCron: "0 */6 * * *" },
      nodes: [
        { id: "n1", type: "email.send_test", name: "Send Internal Test", config: { to: "qa@runash.ai" }, position: { x: 120, y: 120 } },
        { id: "n2", type: "email.send_broadcast", name: "Send Welcome Campaign", config: { audienceId: "new-signups" }, position: { x: 360, y: 120 } },
      ],
      connections: [{ id: "c1", sourceNodeId: "n1", sourcePortId: "delivery-out", targetNodeId: "n2", targetPortId: "event-in" }],
    },
  },
  {
    id: "template-email-re-engagement",
    name: "Email Re-engagement",
    category: "email-automation",
    description: "Webhook-triggered re-engagement when email events show inactivity.",
    rating: 4.7,
    uses: 202,
    graph: {
      name: "Email Re-engagement",
      trigger: { type: "webhook_event", webhookEventType: "opened" },
      nodes: [
        { id: "n1", type: "email.webhook_event_trigger", name: "Open Event Trigger", config: { eventType: "opened" }, position: { x: 80, y: 180 } },
        { id: "n2", type: "email.send_broadcast", name: "Re-engagement Broadcast", config: { audienceId: "inactive-30d" }, position: { x: 340, y: 180 } },
      ],
      connections: [{ id: "c1", sourceNodeId: "n1", sourcePortId: "event-out", targetNodeId: "n2", targetPortId: "event-in" }],
    },
  },
  {
    id: "template-email-bounce-cleanup",
    name: "Bounce Cleanup Automation",
    category: "email-automation",
    description: "Automatically import and suppress bounced contacts from webhook notifications.",
    rating: 4.8,
    uses: 145,
    graph: {
      name: "Bounce Cleanup Automation",
      trigger: { type: "webhook_event", webhookEventType: "bounced" },
      nodes: [
        { id: "n1", type: "email.webhook_event_trigger", name: "Bounce Trigger", config: { eventType: "bounced" }, position: { x: 100, y: 220 } },
        { id: "n2", type: "email.import_contacts", name: "Update Suppression List", config: { listName: "suppression" }, position: { x: 360, y: 220 } },
      ],
      connections: [{ id: "c1", sourceNodeId: "n1", sourcePortId: "event-out", targetNodeId: "n2", targetPortId: "event-in" }],
    },
  },
  {
    id: "template-email-ai-reply-triage",
    name: "AI Reply Triage",
    category: "email-automation",
    description: "Inbound replies are triaged and escalated to agents for rapid handling.",
    rating: 4.8,
    uses: 167,
    graph: {
      name: "AI Reply Triage",
      trigger: { type: "webhook_event", webhookEventType: "inbound_reply" },
      nodes: [
        { id: "n1", type: "email.webhook_event_trigger", name: "Inbound Reply Trigger", config: { eventType: "inbound_reply" }, position: { x: 80, y: 260 } },
        {
          id: "n2",
          type: "email.handle_inbound_reply",
          name: "AI Reply Classifier",
          config: { confidenceThreshold: 0.75, assignToAgent: true },
          position: { x: 360, y: 260 },
        },
      ],
      connections: [{ id: "c1", sourceNodeId: "n1", sourcePortId: "event-out", targetNodeId: "n2", targetPortId: "event-in" }],
    },
  },
]

export function templateToWorkflow(templateId: string) {
  const template = WORKFLOW_TEMPLATES.find((item) => item.id === templateId)
  if (!template) return null

  return {
    id: `workflow-${template.id}-${Date.now()}`,
    name: template.name,
    description: template.description,
    createdAt: now,
    updatedAt: now,
    trigger: template.graph.trigger,
    nodes: template.graph.nodes,
    connections: template.graph.connections,
  }
}
