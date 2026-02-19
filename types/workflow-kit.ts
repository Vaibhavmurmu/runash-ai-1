export type WorkflowNodeCategory = "input" | "video" | "ai" | "streaming" | "output" | "email" | "trigger"

export type WorkflowExecutionStatus = "idle" | "running" | "paused" | "completed" | "failed"

export type WorkflowPortType = "video" | "audio" | "metadata" | "text" | "analytics" | "event"

export type WorkflowTriggerType = "schedule" | "webhook_event" | "manual"

export type WorkflowWebhookEventType = "delivered" | "opened" | "bounced" | "clicked" | "inbound_reply"

export interface WorkflowTriggerConfig {
  type: WorkflowTriggerType
  scheduleCron?: string
  webhookEventType?: WorkflowWebhookEventType
}

export interface WorkflowPort {
  id: string
  label: string
  type: WorkflowPortType
  required?: boolean
}

export interface WorkflowNodeDefinition {
  type: string
  label: string
  description: string
  category: WorkflowNodeCategory
  color: string
  icon: string
  inputs: WorkflowPort[]
  outputs: WorkflowPort[]
  defaultConfig: Record<string, string | number | boolean | string[]>
}

export interface WorkflowNode {
  id: string
  type: string
  name: string
  config: Record<string, unknown>
  position: { x: number; y: number }
}

export interface WorkflowConnection {
  id: string
  sourceNodeId: string
  sourcePortId: string
  targetNodeId: string
  targetPortId: string
}

export interface WorkflowGraph {
  id: string
  name: string
  description?: string
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  trigger: WorkflowTriggerConfig
  createdAt: string
  updatedAt: string
}

export interface NodeExecutionResult {
  nodeId: string
  startedAt: string
  completedAt?: string
  status: Exclude<WorkflowExecutionStatus, "idle" | "paused">
  output?: Record<string, unknown>
  error?: string
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  status: WorkflowExecutionStatus
  progress: number
  startedAt: string
  completedAt?: string
  results: NodeExecutionResult[]
  logs: string[]
  rollbackStatus?: "not-required" | "completed" | "failed"
  rollbackLogs?: string[]
}

export interface WorkflowAuditRecord {
  id: string
  executionId: string
  workflowId: string
  workflowName: string
  trigger: WorkflowTriggerConfig
  action: "workflow_start" | "node_start" | "node_complete" | "node_failed" | "workflow_complete" | "workflow_failed" | "rollback"
  nodeId?: string
  nodeType?: string
  status: "info" | "success" | "failed"
  message: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface WorkflowTemplate {
  id: string
  name: string
  category: "live-commerce" | "sports" | "education" | "gaming" | "events" | "news" | "email-automation"
  description: string
  rating: number
  uses: number
  graph: Omit<WorkflowGraph, "id" | "createdAt" | "updatedAt">
}
