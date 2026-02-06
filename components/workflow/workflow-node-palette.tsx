'use client'

import React from 'react'
import { nodeDefinitions } from '@/lib/workflow/nodes/registry'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface WorkflowNodePaletteProps {
  onAddNode: (nodeType: string) => void
}

export function WorkflowNodePalette({ onAddNode }: WorkflowNodePaletteProps) {
  const categories = Array.from(
    new Set(Object.values(nodeDefinitions).map((n) => n.category))
  ).sort()

  return (
    <Card className="w-64 border-r h-screen flex flex-col bg-card">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Workflow Nodes</h3>
        <p className="text-xs text-muted-foreground mt-1">Drag to canvas to add</p>
      </div>

      <ScrollArea className="flex-1">
        <Tabs defaultValue={categories[0] || 'Input'} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 px-4">
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category} value={category} className="p-3 space-y-2 m-0">
              {Object.values(nodeDefinitions)
                .filter((n) => n.category === category)
                .map((nodeDef) => (
                  <div
                    key={nodeDef.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('application/json', JSON.stringify(nodeDef))
                    }}
                    className="p-3 rounded border cursor-grab active:cursor-grabbing bg-muted hover:bg-muted/80 transition-colors"
                    style={{ borderLeft: `3px solid ${nodeDef.color}` }}
                  >
                    <div className="font-xs font-medium text-sm">{nodeDef.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{nodeDef.description}</div>
                  </div>
                ))}
            </TabsContent>
          ))}
        </Tabs>
      </ScrollArea>
    </Card>
  )
}
