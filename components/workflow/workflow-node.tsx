'use client'

import React, { useState } from 'react'
import { WorkflowNode as WorkflowNodeType } from '@/lib/workflow/types'
import { Handle, Position } from 'reactflow'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, Trash2, Settings } from 'lucide-react'

interface WorkflowNodeProps {
  data: WorkflowNodeType & {
    isSelected?: boolean
    onSelect?: (id: string) => void
    onDelete?: (id: string) => void
    onConfigure?: (id: string) => void
  }
}

export function WorkflowNode({ data }: WorkflowNodeProps) {
  const [showInputs, setShowInputs] = useState(true)
  const color = data.metadata?.color || '#FF6B35'

  return (
    <Card className="w-64 bg-card border-2" style={{ borderColor: color }}>
      <div
        className="px-4 py-3 text-white font-semibold flex items-center justify-between cursor-pointer"
        style={{ backgroundColor: color }}
        onClick={() => data.onSelect?.(data.id)}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white opacity-70"></div>
          <span className="text-sm">{data.label}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowInputs(!showInputs)
          }}
          className="p-1 hover:bg-white/20 rounded"
        >
          <ChevronDown size={16} className={`transition-transform ${showInputs ? '' : '-rotate-180'}`} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {showInputs && (
          <div className="space-y-2">
            {Object.entries(data.inputs || {}).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{key}</span>
                <Handle type="target" position={Position.Left} id={key} />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {Object.entries(data.outputs || {}).map(([key]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{key}</span>
              <Handle type="source" position={Position.Right} id={key} />
            </div>
          ))}
        </div>

        <div className="flex gap-1 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 bg-transparent"
            onClick={() => data.onConfigure?.(data.id)}
          >
            <Settings size={14} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 bg-transparent"
            onClick={() => data.onDelete?.(data.id)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </Card>
  )
}
