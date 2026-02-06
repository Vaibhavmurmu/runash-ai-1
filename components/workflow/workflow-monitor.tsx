'use client'

import React, { useState } from 'react'
import { WorkflowExecution } from '@/lib/workflow/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, AlertCircle, Clock, Zap, Pause, Play } from 'lucide-react'

interface WorkflowMonitorProps {
  execution?: WorkflowExecution
  onPause?: (id: string) => void
  onResume?: (id: string) => void
}

export function WorkflowMonitor({ execution, onPause, onResume }: WorkflowMonitorProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  if (!execution) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <p>No workflow execution data available</p>
      </Card>
    )
  }

  const statusColor = {
    pending: 'text-yellow-600',
    running: 'text-blue-600',
    completed: 'text-green-600',
    failed: 'text-red-600',
    paused: 'text-orange-600',
  }

  const statusIcon = {
    pending: <Clock size={20} />,
    running: <Zap size={20} className="animate-spin" />,
    completed: <CheckCircle size={20} />,
    failed: <AlertCircle size={20} />,
    paused: <Pause size={20} />,
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Execution: {execution.id}</h3>
            <p className="text-sm text-muted-foreground">Workflow: {execution.workflowId}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${statusColor[execution.status]}`}>
              {statusIcon[execution.status]}
              <span className="font-semibold capitalize">{execution.status}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{execution.progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary to-primary/70 h-2 rounded-full transition-all"
                style={{ width: `${execution.progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Start Time</p>
              <p className="font-mono text-xs mt-1">
                {execution.startTime
                  ? new Date(execution.startTime).toLocaleTimeString()
                  : 'N/A'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-mono text-xs mt-1">
                {execution.endTime && execution.startTime
                  ? `${Math.round((new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime()) / 1000)}s`
                  : 'Running...'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Errors</p>
              <p className="font-mono text-xs mt-1 text-red-600">{execution.errors.length}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          {execution.status === 'running' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPause?.(execution.id)}
            >
              <Pause size={16} className="mr-2" />
              Pause
            </Button>
          )}
          {execution.status === 'paused' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResume?.(execution.id)}
            >
              <Play size={16} className="mr-2" />
              Resume
            </Button>
          )}
        </div>
      </Card>

      <Tabs defaultValue="nodes" className="w-full">
        <TabsList>
          <TabsTrigger value="nodes">Node Results</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="nodes" className="space-y-3">
          {Object.entries(execution.nodeResults).map(([nodeId, result]) => (
            <Card
              key={nodeId}
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedNodeId(selectedNodeId === nodeId ? null : nodeId)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-mono text-sm font-semibold">{nodeId}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Result: {typeof result === 'object' ? JSON.stringify(result).slice(0, 50) + '...' : String(result).slice(0, 50)}
                  </p>
                </div>
                <CheckCircle size={16} className="text-green-600" />
              </div>

              {selectedNodeId === nodeId && (
                <div className="mt-3 pt-3 border-t">
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="errors" className="space-y-3">
          {execution.errors.length === 0 ? (
            <Card className="p-4 text-center text-muted-foreground">
              <p>No errors during execution</p>
            </Card>
          ) : (
            execution.errors.map((error, idx) => (
              <Card key={idx} className="p-4 border-red-200 bg-red-50 dark:bg-red-950">
                <div>
                  <p className="font-mono text-sm font-semibold text-red-600">
                    {error.nodeId}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-200 mt-2">{error.message}</p>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-3">
          <Card className="p-4">
            <div className="space-y-4">
              {Object.keys(execution.nodeResults).map((nodeId, idx) => (
                <div key={nodeId} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    {idx < Object.keys(execution.nodeResults).length - 1 && (
                      <div className="w-0.5 h-12 bg-border my-2" />
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-semibold">{nodeId}</p>
                    <p className="text-xs text-muted-foreground">Execution step {idx + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
