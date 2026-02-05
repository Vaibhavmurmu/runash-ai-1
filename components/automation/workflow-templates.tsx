"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LayoutTemplateIcon as Template, Users, Zap } from "lucide-react"
import type { WorkflowTemplate } from "@/lib/hooks/use-workflows"

interface WorkflowTemplatesProps {
  templates: WorkflowTemplate[]
  onCreateFromTemplate: (templateId: string, customizations?: any) => void
}

export function WorkflowTemplates({ templates, onCreateFromTemplate }: WorkflowTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)
  const [customizations, setCustomizations] = useState({
    name: "",
    description: "",
  })

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

  const handleUseTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template)
    setCustomizations({
      name: template.name,
      description: template.description || "",
    })
  }

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate) return

    onCreateFromTemplate(selectedTemplate.id, customizations)
    setSelectedTemplate(null)
    setCustomizations({ name: "", description: "" })
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <Template className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">No templates available</h3>
        <p className="text-muted-foreground">Workflow templates will appear here when available.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const templateData = template.template_data as any
          const stepCount = Array.isArray(templateData.steps) ? templateData.steps.length : 0

          return (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCategoryIcon(template.category)}</span>
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {template.category}
                  </Badge>
                  <Badge variant="secondary">{stepCount} steps</Badge>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Used {template.usage_count} times</span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Workflow Steps:</h4>
                  <div className="space-y-1">
                    {templateData.steps?.slice(0, 3).map((step: any, index: number) => (
                      <div key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                        {step.type.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </div>
                    ))}
                    {stepCount > 3 && <div className="text-xs text-muted-foreground">+{stepCount - 3} more steps</div>}
                  </div>
                </div>

                <Button className="w-full" onClick={() => handleUseTemplate(template)}>
                  <Zap className="mr-2 h-4 w-4" />
                  Use Template
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize Workflow</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name</Label>
              <Input
                id="name"
                value={customizations.name}
                onChange={(e) => setCustomizations((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter workflow name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={customizations.description}
                onChange={(e) => setCustomizations((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this workflow does"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFromTemplate}>Create Workflow</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
