import { EventEmitter } from "events"
import { getNodeHandler, getNodeRollbackHandler } from "@/lib/workflow-kit/node-handlers"
import { writeWorkflowAuditRecord } from "@/lib/workflow-kit/execution-audit-store"
import { WorkflowAuditRecord, WorkflowExecution, WorkflowGraph, WorkflowNode } from "@/types/workflow-kit"

export type WorkflowEngineEvents =
  | "execution:start"
  | "execution:update"
  | "execution:complete"
  | "execution:error"
  | "node:start"
  | "node:complete"

export class WorkflowEngine extends EventEmitter {
  private isPaused = false

  pause() {
    this.isPaused = true
  }

  resume() {
    this.isPaused = false
  }

  async execute(graph: WorkflowGraph): Promise<WorkflowExecution> {
    this.ensureValidTrigger(graph)

    const execution: WorkflowExecution = {
      id: `exec-${Date.now()}`,
      workflowId: graph.id,
      status: "running",
      progress: 0,
      startedAt: new Date().toISOString(),
      results: [],
      logs: [`Execution started for ${graph.name}`],
      rollbackStatus: "not-required",
      rollbackLogs: [],
    }

    this.writeAudit(execution, graph, {
      action: "workflow_start",
      status: "info",
      message: `Workflow started via ${graph.trigger.type}`,
      metadata: { trigger: graph.trigger },
    })

    this.emit("execution:start", execution)

    try {
      const orderedNodes = this.topologicalSort(graph)
      const context = new Map<string, Record<string, unknown>>()

      for (let i = 0; i < orderedNodes.length; i++) {
        const node = orderedNodes[i]
        while (this.isPaused) {
          await new Promise((resolve) => setTimeout(resolve, 80))
        }

        this.emit("node:start", node)
        const startedAt = new Date().toISOString()

        this.writeAudit(execution, graph, {
          action: "node_start",
          nodeId: node.id,
          nodeType: node.type,
          status: "info",
          message: `Node ${node.name} started`,
        })

        const input = this.resolveInput(graph, node, context)

        try {
          const output = await getNodeHandler(node.type)(node, input)
          context.set(node.id, output)

          const completedAt = new Date().toISOString()
          execution.results.push({
            nodeId: node.id,
            status: "completed",
            startedAt,
            completedAt,
            output,
          })

          this.writeAudit(execution, graph, {
            action: "node_complete",
            nodeId: node.id,
            nodeType: node.type,
            status: "success",
            message: `Node ${node.name} completed`,
            metadata: { output },
          })

          execution.progress = Math.round(((i + 1) / orderedNodes.length) * 100)
          execution.logs.push(`Node ${node.name} completed`)
          this.emit("node:complete", { node, output })
          this.emit("execution:update", execution)
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown node error"
          execution.results.push({
            nodeId: node.id,
            status: "failed",
            startedAt,
            completedAt: new Date().toISOString(),
            error: message,
          })

          this.writeAudit(execution, graph, {
            action: "node_failed",
            nodeId: node.id,
            nodeType: node.type,
            status: "failed",
            message: `Node ${node.name} failed: ${message}`,
          })

          throw error
        }
      }

      execution.status = "completed"
      execution.completedAt = new Date().toISOString()
      this.writeAudit(execution, graph, {
        action: "workflow_complete",
        status: "success",
        message: "Workflow completed successfully",
      })
      this.emit("execution:complete", execution)
      return execution
    } catch (error) {
      execution.status = "failed"
      execution.completedAt = new Date().toISOString()
      const message = error instanceof Error ? error.message : "Unknown error"
      execution.logs.push(`Execution failed: ${message}`)

      const rollbackLogs = await this.rollbackCompletedNodes(graph, execution)
      execution.rollbackLogs = rollbackLogs
      execution.rollbackStatus = rollbackLogs.some((log) => log.startsWith("FAILED")) ? "failed" : "completed"

      this.writeAudit(execution, graph, {
        action: "workflow_failed",
        status: "failed",
        message: `Workflow failed: ${message}`,
        metadata: { rollbackStatus: execution.rollbackStatus },
      })

      this.emit("execution:error", error)
      return execution
    }
  }

  private async rollbackCompletedNodes(graph: WorkflowGraph, execution: WorkflowExecution) {
    const rollbackLogs: string[] = []
    const completedResults = execution.results.filter((result) => result.status === "completed" && result.output)

    for (const result of [...completedResults].reverse()) {
      const node = graph.nodes.find((item) => item.id === result.nodeId)
      if (!node || !result.output) continue

      const rollbackHandler = getNodeRollbackHandler(node.type)
      if (!rollbackHandler) continue

      try {
        const message = await rollbackHandler(node, result.output)
        rollbackLogs.push(`OK ${node.name}: ${message}`)
        this.writeAudit(execution, graph, {
          action: "rollback",
          nodeId: node.id,
          nodeType: node.type,
          status: "success",
          message: `Rollback completed for ${node.name}`,
          metadata: { rollbackMessage: message },
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown rollback error"
        rollbackLogs.push(`FAILED ${node.name}: ${message}`)
        this.writeAudit(execution, graph, {
          action: "rollback",
          nodeId: node.id,
          nodeType: node.type,
          status: "failed",
          message: `Rollback failed for ${node.name}: ${message}`,
        })
      }
    }

    return rollbackLogs
  }

  private writeAudit(
    execution: WorkflowExecution,
    graph: WorkflowGraph,
    data: Omit<WorkflowAuditRecord, "id" | "executionId" | "workflowId" | "workflowName" | "trigger" | "timestamp">,
  ) {
    writeWorkflowAuditRecord({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      executionId: execution.id,
      workflowId: graph.id,
      workflowName: graph.name,
      trigger: graph.trigger,
      timestamp: new Date().toISOString(),
      ...data,
    })
  }

  private ensureValidTrigger(graph: WorkflowGraph) {
    if (!graph.trigger) throw new Error("Workflow trigger is required")

    if (graph.trigger.type === "schedule" && !graph.trigger.scheduleCron) {
      throw new Error("Schedule trigger requires scheduleCron")
    }

    if (graph.trigger.type === "webhook_event" && !graph.trigger.webhookEventType) {
      throw new Error("Webhook event trigger requires webhookEventType")
    }
  }

  private resolveInput(
    graph: WorkflowGraph,
    node: WorkflowNode,
    context: Map<string, Record<string, unknown>>,
  ): Record<string, unknown> {
    const upstream = graph.connections.filter((connection) => connection.targetNodeId === node.id)
    return upstream.reduce<Record<string, unknown>>((acc, connection) => {
      acc[`${connection.sourceNodeId}.${connection.sourcePortId}`] = context.get(connection.sourceNodeId)
      return acc
    }, {})
  }

  private topologicalSort(graph: WorkflowGraph): WorkflowNode[] {
    const inDegree = new Map<string, number>()
    const adjacency = new Map<string, string[]>()

    graph.nodes.forEach((node) => {
      inDegree.set(node.id, 0)
      adjacency.set(node.id, [])
    })

    graph.connections.forEach((connection) => {
      adjacency.get(connection.sourceNodeId)?.push(connection.targetNodeId)
      inDegree.set(connection.targetNodeId, (inDegree.get(connection.targetNodeId) ?? 0) + 1)
    })

    const queue = graph.nodes.filter((node) => (inDegree.get(node.id) ?? 0) === 0)
    const ordered: WorkflowNode[] = []

    while (queue.length > 0) {
      const current = queue.shift()!
      ordered.push(current)

      for (const next of adjacency.get(current.id) ?? []) {
        const nextDegree = (inDegree.get(next) ?? 1) - 1
        inDegree.set(next, nextDegree)
        if (nextDegree === 0) {
          const node = graph.nodes.find((item) => item.id === next)
          if (node) queue.push(node)
        }
      }
    }

    if (ordered.length !== graph.nodes.length) {
      throw new Error("Workflow has cyclic dependencies")
    }

    return ordered
  }
}
