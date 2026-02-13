"use client"

import { useEffect, useRef, useState } from "react"
import { WorkflowBuilder } from "@/components/workflow/workflow-builder"
import { WorkflowMarketplace } from "@/components/workflow/workflow-marketplace"
import { WorkflowMonitor } from "@/components/workflow/workflow-monitor"
import { Workflow, WorkflowExecution } from "@/lib/workflow/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GitBranch, MonitorPlay, Store } from "lucide-react"

const initialWorkflow: Workflow = {
  id: "workflow-starter",
  name: "Workflow Starter",
  description: "Build, monitor, and reuse workflows from marketplace templates.",
  version: "1.0.0",
  nodes: [],
  connections: [],
  inputs: {},
  outputs: {},
  settings: {},
  createdAt: new Date(),
  updatedAt: new Date(),
}

const initialExecution: WorkflowExecution = {
  id: "execution-starter",
  workflowId: initialWorkflow.id,
  status: "pending",
  nodeResults: {},
  errors: [],
  progress: 0,
}

export default function WorkflowPage() {
  const [workflow, setWorkflow] = useState<Workflow>(initialWorkflow)
  const [execution, setExecution] = useState<WorkflowExecution>(initialExecution)
  const executionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearExecutionInterval = () => {
    if (!executionIntervalRef.current) {
      return
    }

    clearInterval(executionIntervalRef.current)
    executionIntervalRef.current = null
  }

  useEffect(() => {
    if (execution.status !== "running") {
      return
    }

    clearExecutionInterval()

    executionIntervalRef.current = setInterval(() => {
      setExecution((currentExecution) => {
        if (currentExecution.status !== "running") {
          return currentExecution
        }

        const nextProgress = Math.min(currentExecution.progress + 10, 100)

        if (nextProgress >= 100) {
          clearExecutionInterval()

          return {
            ...currentExecution,
            status: "completed",
            progress: 100,
            endTime: new Date(),
          }
        }

        return {
          ...currentExecution,
          progress: nextProgress,
        }
      })
    }, 700)

    return () => {
      clearExecutionInterval()
    }
  }, [execution.status])

  useEffect(() => {
    return () => {
      clearExecutionInterval()
    }
  }, [])

  return (
    <main className="container mx-auto space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-2xl">Workflow Orchestration</CardTitle>
            <Badge variant="secondary">Beta</Badge>
          </div>
          <CardDescription>
            Create workflows in the builder, discover ready-made templates in the marketplace, and track runtime execution in monitor.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="builder" className="space-y-4">
        <TabsList>
          <TabsTrigger value="builder" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Builder
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-2">
            <Store className="h-4 w-4" />
            Marketplace
          </TabsTrigger>
          <TabsTrigger value="monitor" className="gap-2">
            <MonitorPlay className="h-4 w-4" />
            Monitor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <Card>
            <CardContent className="p-0">
              <WorkflowBuilder
                workflow={workflow}
                onSave={(nextWorkflow) => setWorkflow(nextWorkflow)}
                onExecute={(nextWorkflow) => {
                  clearExecutionInterval()
                  setWorkflow(nextWorkflow)
                  setExecution({
                    id: `execution-${Date.now()}`,
                    workflowId: nextWorkflow.id,
                    status: "running",
                    startTime: new Date(),
                    endTime: undefined,
                    nodeResults: {},
                    errors: [],
                    progress: 0,
                  })
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketplace">
          <WorkflowMarketplace
            onSelectTemplate={(template) => {
              setWorkflow(template.workflow)
            }}
          />
        </TabsContent>

        <TabsContent value="monitor">
          <WorkflowMonitor execution={execution} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
