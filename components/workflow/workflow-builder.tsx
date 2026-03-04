'use client'

import React, { useCallback, useState } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Workflow } from '@/lib/workflow/types'
import { WorkflowNode } from './workflow-node'
import { WorkflowNodePalette } from './workflow-node-palette'
import { WorkflowNodeConfigurator } from './workflow-node-configurator'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Save } from 'lucide-react'

interface WorkflowBuilderProps {
  workflow?: Workflow
  onSave?: (workflow: Workflow) => void
  onExecute?: (workflow: Workflow) => void
}

const nodeTypes = {
  workflow: WorkflowNode,
}

export function WorkflowBuilder({ workflow, onSave, onExecute }: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showConfigurator, setShowConfigurator] = useState(false)

  // Convert workflow to React Flow nodes and edges
  React.useEffect(() => {
    if (workflow) {
      const flowNodes: Node[] = workflow.nodes.map((node) => ({
        id: node.id,
        data: {
          ...node,
          isSelected: selectedNodeId === node.id,
          onSelect: setSelectedNodeId,
          onDelete: handleDeleteNode,
          onConfigure: handleConfigureNode,
        },
        position: node.position,
        type: 'workflow',
      }))

      const flowEdges: Edge[] = workflow.connections.map((conn) => ({
        id: conn.id,
        source: conn.source,
        target: conn.target,
        sourceHandle: conn.sourceOutput,
        targetHandle: conn.targetInput,
      }))

      setNodes(flowNodes)
      setEdges(flowEdges)
    }
  }, [workflow, selectedNodeId, setNodes, setEdges])

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds))
    },
    [setEdges]
  )

  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
  }

  const handleConfigureNode = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    setShowConfigurator(true)
  }

  const handleSave = () => {
    const updatedWorkflow: Workflow = {
      ...workflow || {
        id: `workflow-${Date.now()}`,
        name: 'Untitled Workflow',
        version: '1.0.0',
        inputs: {},
        outputs: {},
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.type,
        label: n.data.label,
        inputs: n.data.inputs,
        outputs: n.data.outputs,
        config: n.data.config,
        position: n.position || { x: 0, y: 0 },
        metadata: n.data.metadata,
      })),
      connections: edges.map((e) => ({
        id: e.id || `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        sourceOutput: e.sourceHandle || '',
        targetInput: e.targetHandle || '',
      })),
      updatedAt: new Date(),
    }
    onSave?.(updatedWorkflow)
  }

  const handleExecute = () => {
    const executingWorkflow: Workflow = {
      ...workflow || {
        id: `workflow-${Date.now()}`,
        name: 'Untitled Workflow',
        version: '1.0.0',
        inputs: {},
        outputs: {},
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.type,
        label: n.data.label,
        inputs: n.data.inputs,
        outputs: n.data.outputs,
        config: n.data.config,
        position: n.position || { x: 0, y: 0 },
        metadata: n.data.metadata,
      })),
      connections: edges.map((e) => ({
        id: e.id || `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        sourceOutput: e.sourceHandle || '',
        targetInput: e.targetHandle || '',
      })),
    }
    onExecute?.(executingWorkflow)
  }

  return (
    <div className="flex h-screen bg-background">
      <WorkflowNodePalette onAddNode={(nodeType) => {
        // Add node logic
      }} />

      <div className="flex-1 flex flex-col">
        <div className="bg-card border-b p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{workflow?.name || 'Untitled Workflow'}</h2>
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

        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>

      {showConfigurator && selectedNodeId && (
        <WorkflowNodeConfigurator
          nodeId={selectedNodeId}
          onClose={() => setShowConfigurator(false)}
        />
      )}
    </div>
  )
  }

