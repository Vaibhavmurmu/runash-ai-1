import { Workflow, WorkflowExecution, WorkflowNode } from './types'
import { EventEmitter } from 'events'

export class WorkflowEngine extends EventEmitter {
  private executions: Map<string, WorkflowExecution> = new Map()
  private nodeRegistry: Map<string, any> = new Map()

  async executeWorkflow(workflow: Workflow, inputs: Record<string, any>): Promise<WorkflowExecution> {
    const executionId = this.generateId()
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      status: 'pending',
      nodeResults: {},
      errors: [],
      progress: 0,
      startTime: new Date(),
    }

    this.executions.set(executionId, execution)
    this.emit('execution:start', execution)

    try {
      execution.status = 'running'
      const orderedNodes = this.topologicalSort(workflow.nodes, workflow.connections)
      
      for (let i = 0; i < orderedNodes.length; i++) {
        const node = orderedNodes[i]
        try {
          const nodeInputs = this.resolveNodeInputs(node, workflow.connections, execution.nodeResults)
          const result = await this.executeNode(node, nodeInputs)
          execution.nodeResults[node.id] = result
          execution.progress = ((i + 1) / orderedNodes.length) * 100
          this.emit('node:complete', { nodeId: node.id, result })
        } catch (error: any) {
          execution.errors.push({
            nodeId: node.id,
            message: error.message,
            timestamp: new Date(),
          })
          if (!workflow.settings?.retries) throw error
        }
      }

      execution.status = 'completed'
      execution.endTime = new Date()
      this.emit('execution:complete', execution)
    } catch (error: any) {
      execution.status = 'failed'
      execution.endTime = new Date()
      this.emit('execution:error', { execution, error })
    }

    return execution
  }

  private async executeNode(node: WorkflowNode, inputs: Record<string, any>): Promise<any> {
    const handler = this.nodeRegistry.get(node.type)
    if (!handler) throw new Error(`No handler for node type: ${node.type}`)
    return handler(inputs, node.config)
  }

  private topologicalSort(nodes: WorkflowNode[], connections: any[]): WorkflowNode[] {
    const result: WorkflowNode[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return
      if (visiting.has(nodeId)) throw new Error('Circular dependency detected')
      visiting.add(nodeId)

      const node = nodes.find(n => n.id === nodeId)
      if (!node) return

      connections
        .filter(c => c.source === nodeId)
        .forEach(c => visit(c.target))

      visiting.delete(nodeId)
      visited.add(nodeId)
      result.push(node)
    }

    nodes.forEach(node => visit(node.id))
    return result
  }

  private resolveNodeInputs(node: WorkflowNode, connections: any[], results: Record<string, any>): Record<string, any> {
    const inputs: Record<string, any> = { ...node.inputs }
    connections
      .filter(c => c.target === node.id)
      .forEach(c => {
        inputs[c.targetInput] = results[c.source]?.[c.sourceOutput]
      })
    return inputs
  }

  registerNodeHandler(type: string, handler: Function): void {
    this.nodeRegistry.set(type, handler)
  }

  getExecution(id: string): WorkflowExecution | undefined {
    return this.executions.get(id)
  }

  pauseExecution(id: string): void {
    const execution = this.executions.get(id)
    if (execution) execution.status = 'paused'
  }

  resumeExecution(id: string): void {
    const execution = this.executions.get(id)
    if (execution) execution.status = 'running'
  }

  private generateId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

