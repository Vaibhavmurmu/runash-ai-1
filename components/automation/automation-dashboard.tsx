"use client"

import { useState } from "react"
import { useWorkflows } from "@/lib/hooks/use-workflows"
import { WorkflowsList } from "@/components/automation/workflows-list"
import { WorkflowBuilder } from "@/components/automation/workflow-builder"
import { WorkflowTemplates } from "@/components/automation/workflow-templates"
import { WorkflowStats } from "@/components/automation/workflow-stats"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PlusCircle, Zap, LayoutTemplateIcon as Template, BarChart3 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Mock user ID until auth is fully implemented
const MOCK_USER_ID = "user-123"

export function AutomationDashboard() {
  const {
    workflows,
    templates,
    executions,
    loading,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
    toggleWorkflow,
    createFromTemplate,
  } = useWorkflows(MOCK_USER_ID)

  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("workflows")
  const { toast } = useToast()

  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId)

  const handleCreateWorkflow = async (workflowData: any) => {
    const { data, error } = await createWorkflow(workflowData)
    if (error) {
      toast({
        title: "Error creating workflow",
        description: error,
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Workflow created",
      description: `${workflowData.name} has been created successfully.`,
    })
    setIsBuilderOpen(false)
  }

  const handleUpdateWorkflow = async (id: string, updates: any) => {
    const { error } = await updateWorkflow(id, updates)
    if (error) {
      toast({
        title: "Error updating workflow",
        description: error,
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Workflow updated",
      description: "The workflow has been updated successfully.",
    })
    setSelectedWorkflowId(null)
  }

  const handleDeleteWorkflow = async (id: string) => {
    const { error } = await deleteWorkflow(id)
    if (error) {
      toast({
        title: "Error deleting workflow",
        description: error,
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Workflow deleted",
      description: "The workflow has been deleted successfully.",
    })
  }

  const handleExecuteWorkflow = async (id: string) => {
    const { error } = await executeWorkflow(id)
    if (error) {
      toast({
        title: "Error executing workflow",
        description: error,
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Workflow executed",
      description: "The workflow has been started successfully.",
    })
  }

  const handleToggleWorkflow = async (id: string, enabled: boolean) => {
    const { error } = await toggleWorkflow(id, enabled)
    if (error) {
      toast({
        title: "Error updating workflow",
        description: error,
        variant: "destructive",
      })
      return
    }

    toast({
      title: enabled ? "Workflow activated" : "Workflow paused",
      description: enabled ? "The workflow is now active." : "The workflow has been paused.",
    })
  }

  const handleCreateFromTemplate = async (templateId: string, customizations?: any) => {
    const { data, error } = await createFromTemplate(templateId, customizations)
    if (error) {
      toast({
        title: "Error creating workflow from template",
        description: error,
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Workflow created from template",
      description: "Your new workflow is ready to use.",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automation Workflows</h1>
          <p className="text-muted-foreground">Automate your live streaming business with powerful workflows.</p>
        </div>
        <Button onClick={() => setIsBuilderOpen(true)} className="shrink-0">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      <WorkflowStats workflows={workflows} executions={executions} />

      <Tabs defaultValue="workflows" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Template className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="mt-6">
          <WorkflowsList
            workflows={workflows}
            isLoading={loading}
            onSelect={setSelectedWorkflowId}
            onExecute={handleExecuteWorkflow}
            onToggle={handleToggleWorkflow}
            onDelete={handleDeleteWorkflow}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <WorkflowTemplates templates={templates} onCreateFromTemplate={handleCreateFromTemplate} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Analytics Coming Soon</h3>
            <p className="text-muted-foreground">
              Detailed workflow analytics and performance metrics will be available here.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
          </DialogHeader>
          <WorkflowBuilder onSave={handleCreateWorkflow} onCancel={() => setIsBuilderOpen(false)} />
        </DialogContent>
      </Dialog>

      {selectedWorkflow && (
        <Dialog open={!!selectedWorkflowId} onOpenChange={(open) => !open && setSelectedWorkflowId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Workflow: {selectedWorkflow.name}</DialogTitle>
            </DialogHeader>
            <WorkflowBuilder
              workflow={selectedWorkflow}
              onSave={(data) => handleUpdateWorkflow(selectedWorkflow.id, data)}
              onCancel={() => setSelectedWorkflowId(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
