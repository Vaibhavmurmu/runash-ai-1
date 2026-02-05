"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, Play, CheckCircle, AlertCircle } from "lucide-react"
import type { Workflow, WorkflowExecution } from "@/lib/hooks/use-workflows"

interface WorkflowStatsProps {
  workflows: Workflow[]
  executions: WorkflowExecution[]
}

export function WorkflowStats({ workflows, executions }: WorkflowStatsProps) {
  const activeWorkflows = workflows.filter((w) => w.enabled && w.status === "active").length
  const totalExecutions = workflows.reduce((sum, w) => sum + w.execution_count, 0)
  const recentExecutions = executions.filter((e) => {
    const executionDate = new Date(e.started_at)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return executionDate > oneDayAgo
  }).length

  const successfulExecutions = executions.filter((e) => e.status === "completed").length
  const successRate = executions.length > 0 ? Math.round((successfulExecutions / executions.length) * 100) : 100

  const stats = [
    {
      title: "Active Workflows",
      value: activeWorkflows,
      total: workflows.length,
      icon: Zap,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Total Executions",
      value: totalExecutions,
      icon: Play,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Last 24 Hours",
      value: recentExecutions,
      icon: CheckCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Success Rate",
      value: `${successRate}%`,
      icon: AlertCircle,
      color: successRate >= 90 ? "text-green-600" : successRate >= 70 ? "text-yellow-600" : "text-red-600",
      bgColor: successRate >= 90 ? "bg-green-100" : successRate >= 70 ? "bg-yellow-100" : "bg-red-100",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className={`p-2 rounded-md ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stat.value}
              {stat.total && <span className="text-sm font-normal text-muted-foreground ml-1">/ {stat.total}</span>}
            </div>
            {stat.title === "Active Workflows" && (
              <div className="flex gap-1 mt-2">
                <Badge variant="outline" className="text-xs">
                  {workflows.filter((w) => w.status === "draft").length} Draft
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {workflows.filter((w) => w.status === "paused").length} Paused
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
