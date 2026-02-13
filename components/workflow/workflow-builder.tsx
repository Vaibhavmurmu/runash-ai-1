'use client'

import { useMemo, useState } from 'react'
import { Workflow } from '@/lib/workflow/types'
import { WorkflowNodePalette } from './workflow-node-palette'
import { WorkflowNodeConfigurator } from './workflow-node-configurator'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Save, Settings2, Trash2 } from 'lucide-react'

interface WorkflowBuilderProps {
  workflow?: Workflow
  onSave?: (workflow: Workflow) => void
  onExecute?: (workflow: Workflow) => void
}

export function WorkflowBuilder({ workflow, onSave, onExecute }: WorkflowBuilderProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showConfigurator, setShowConfigurator] = useState(false)
  const [localWorkflow, setLocalWorkflow] = useState<Workflow>(
    workflow || {
      id: `workflow-${Date.now()}`,
      name: 'Untitled Workflow',
      version: '1.0.0',
      nodes: [],
      connections: [],
      inputs: {},
      outputs: {},
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  )

  const effectiveWorkflow = workflow || localWorkflow

  const selectedNode = useMemo(
    () => effectiveWorkflow.nodes.find((node) => node.id === selectedNodeId),
    [effectiveWorkflow.nodes, selectedNodeId]
  )

  const updateWorkflow = (next: Workflow) => {
    if (!workflow) {
      setLocalWorkflow(next)
    }
  }

  const handleAddNode = (nodeType: string) => {
    const next: Workflow = {
      ...effectiveWorkflow,
      nodes: [
        ...effectiveWorkflow.nodes,
        {
          id: `node-${Date.now()}`,
          type: nodeType as Workflow['nodes'][number]['type'],
          label: nodeType,
          inputs: {},
          outputs: {},
          config: {},
          position: { x: 0, y: 0 },
        },
      ],
      updatedAt: new Date(),
    }
    updateWorkflow(next)
    onSave?.(next)
  }

  const handleDeleteNode = (nodeId: string) => {
    const next: Workflow = {
      ...effectiveWorkflow,
      nodes: effectiveWorkflow.nodes.filter((node) => node.id !== nodeId),
      connections: effectiveWorkflow.connections.filter(
        (connection) => connection.source !== nodeId && connection.target !== nodeId
      ),
      updatedAt: new Date(),
    }
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null)
      setShowConfigurator(false)
    }
    updateWorkflow(next)
    onSave?.(next)
  }

  const handleSave = () => {
    const next = { ...effectiveWorkflow, updatedAt: new Date() }
    updateWorkflow(next)
    onSave?.(next)
  }

  const handleExecute = () => {
    onExecute?.(effectiveWorkflow)
  }

  return (
    <div className="flex min-h-[70vh] bg-background">
      <WorkflowNodePalette onAddNode={handleAddNode} />

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b bg-card p-4">
          <h2 className="text-lg font-semibold">{effectiveWorkflow.name}</h2>
          <div className="flex gap-2">
            <Button onClick={handleSave} variant="outline" size="sm">
              <Save size={16} className="mr-2" />
              Save
            </Button>
            <Button onClick={handleExecute} size="sm">
              <Play size={16} className="mr-2" />
              Execute
            </Button>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {effectiveWorkflow.nodes.length === 0 ? (
            <Card className="col-span-full p-6 text-sm text-muted-foreground">
              No nodes yet. Add nodes from the left panel to start building.
            </Card>
          ) : (
            effectiveWorkflow.nodes.map((node) => (
              <Card key={node.id} className="space-y-3 p-4">
                <div>
                  <p className="font-semibold">{node.label}</p>
                  <p className="text-xs text-muted-foreground">Type: {node.type}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedNodeId(node.id)
                      setShowConfigurator(true)
                    }}
                  >
                    <Settings2 size={14} className="mr-2" />
                    Configure
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteNode(node.id)}>
                    <Trash2 size={14} className="mr-2" />
                    Remove
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {showConfigurator && selectedNode && (
        <WorkflowNodeConfigurator nodeId={selectedNode.id} onClose={() => setShowConfigurator(false)} />
      )}
    </div>
  )
}
