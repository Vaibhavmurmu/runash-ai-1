// Workflow Node Types
export type WorkflowNodeType = 
  | 'input' 
  | 'video-processor' 
  | 'ai-model' 
  | 'streaming' 
  | 'output' 
  | 'trigger' 
  | 'condition' 
  | 'loop'

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  label: string
  inputs: Record<string, any>
  outputs: Record<string, any>
  config: Record<string, any>
  position: { x: number; y: number }
  metadata?: {
    description?: string
    icon?: string
    category?: string
    color?: string
  }
}

export interface WorkflowConnection {
  id: string
  source: string // Node ID
  target: string // Node ID
  sourceOutput: string
  targetInput: string
  dataType?: string
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  startTime?: Date
  endTime?: Date
  nodeResults: Record<string, any>
  errors: Array<{ nodeId: string; message: string; timestamp: Date }>
  progress: number
}

export interface Workflow {
  id: string
  name: string
  description?: string
  version: string
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  inputs: Record<string, any>
  outputs: Record<string, any>
  settings: {
    timeout?: number
    retries?: number
    parallelExecution?: boolean
    notifyOnCompletion?: boolean
  }
  createdAt: Date
  updatedAt: Date
  tags?: string[]
  isPublic?: boolean
  owner?: string
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'video' | 'ai' | 'streaming' | 'automation' | 'custom'
  workflow: Workflow
  preview?: string
  usageCount?: number
  rating?: number
  creator?: string
}

