'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, ChevronUp } from 'lucide-react'

interface WorkflowNodeConfiguratorProps {
  nodeId: string
  onClose: () => void
}

export function WorkflowNodeConfigurator({ nodeId, onClose }: WorkflowNodeConfiguratorProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <Card className="fixed bottom-0 right-0 w-96 max-h-96 bg-card border-t border-l flex flex-col shadow-lg rounded-tl-lg rounded-tr-lg">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">Node Configuration</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-muted rounded"
          >
            <ChevronUp
              size={16}
              className={`transition-transform ${isExpanded ? '' : 'rotate-180'}`}
            />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X size={16} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Node ID</label>
            <div className="mt-1 px-3 py-2 bg-muted rounded text-xs font-mono text-muted-foreground">
              {nodeId}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Configuration</label>
            <div className="mt-1 text-xs text-muted-foreground">
              Edit node settings here. Configuration options vary by node type.
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1 bg-transparent" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" size="sm">
              Save
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
