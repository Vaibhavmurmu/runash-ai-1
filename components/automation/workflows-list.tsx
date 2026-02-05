"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Zap, Play, MoreHorizontal, Edit, Trash2, Calendar, Activity, Clock, Loader2 } from "lucide-react"
import type { Workflow } from "@/lib/hooks/use-workflows"

interface WorkflowsListProps {
  workflows: Workflow[]
  isLoading: boolean
  onSelect: (id: string) => void
  onExecute: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
}

export function WorkflowsList({ workflows, isLoading, onSelect, onExecute, onToggle, onDelete }: WorkflowsListProps) {
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "paused":
        return "bg-yellow-500"
      case "draft":
        return "bg-gray-400"
      case "archived":
        return "bg-gray-300"
      default:
        return "bg-gray-400"
    }
  }

  const getStatusBadge = (status: string, enabled: boolean) => {
    if (!enabled) return <Badge variant="secondary">Disabled</Badge>

    switch (status) {
      case "active":
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
      case "paused":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Paused</Badge>
      case "draft":
        return <Badge variant="outline">Draft</Badge>
      case "archived":
        return <Badge variant="secondary">Archived</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "stream":
        return "📺"
      case "product":
        return "📦"
      case "marketing":
        return "📢"
      case "analytics":
        return "📊"
      case "customer":
        return "👥"
      default:
        return "⚡"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (workflows.length === 0) {
    return (
      <div className="text-center py-12">
        <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">No workflows yet</h3>
        <p className="text-muted-foreground mb-6">Create your first automation workflow to get started.</p>
        <Button onClick={() => {}}>
          <Zap className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getCategoryIcon(workflow.category)}</span>
                  <div>
                    <CardTitle className="text-base">{workflow.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{workflow.description || "No description"}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onSelect(workflow.id)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExecute(workflow.id)}>
                      <Play className="mr-2 h-4 w-4" />
                      Run Now
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDeleteWorkflowId(workflow.id)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(workflow.status)}`} />
                  {getStatusBadge(workflow.status, workflow.enabled)}
                </div>
                <Switch checked={workflow.enabled} onCheckedChange={(checked) => onToggle(workflow.id, checked)} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span>{workflow.execution_count} runs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{workflow.last_executed_at ? formatDate(workflow.last_executed_at) : "Never"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created {formatDate(workflow.created_at)}</span>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onExecute(workflow.id)} disabled={!workflow.enabled}>
                  <Play className="mr-2 h-4 w-4" />
                  Run
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onSelect(workflow.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteWorkflowId} onOpenChange={() => setDeleteWorkflowId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the workflow and all its execution history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteWorkflowId) {
                  onDelete(deleteWorkflowId)
                  setDeleteWorkflowId(null)
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
