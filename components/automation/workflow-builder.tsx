"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, GripVertical, Clock, Webhook, Zap, Mail, MessageSquare, ShoppingCart, Bell } from "lucide-react"
import type { Workflow } from "@/lib/hooks/use-workflows"

interface WorkflowBuilderProps {
  workflow?: Workflow
  onSave: (data: any) => void
  onCancel: () => void
}

interface WorkflowStep {
  id: string
  type: string
  name: string
  config: Record<string, any>
  enabled: boolean
}

const STEP_TYPES = [
  { value: "send_email", label: "Send Email", icon: Mail, category: "Communication" },
  { value: "send_notification", label: "Send Notification", icon: Bell, category: "Communication" },
  { value: "send_message", label: "Send Message", icon: MessageSquare, category: "Communication" },
  { value: "update_product", label: "Update Product", icon: ShoppingCart, category: "Product" },
  { value: "check_inventory", label: "Check Inventory", icon: ShoppingCart, category: "Product" },
  { value: "create_order", label: "Create Order", icon: ShoppingCart, category: "Product" },
  { value: "wait", label: "Wait/Delay", icon: Clock, category: "Control" },
  { value: "webhook", label: "Webhook", icon: Webhook, category: "Integration" },
]

const TRIGGER_TYPES = [
  { value: "manual", label: "Manual Trigger" },
  { value: "schedule", label: "Schedule" },
  { value: "event", label: "Event" },
  { value: "webhook", label: "Webhook" },
]

export function WorkflowBuilder({ workflow, onSave, onCancel }: WorkflowBuilderProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "stream" as const,
    trigger_type: "manual" as const,
    trigger_config: {},
    workflow_steps: [] as WorkflowStep[],
    enabled: true,
  })

  useEffect(() => {
    if (workflow) {
      setFormData({
        name: workflow.name,
        description: workflow.description || "",
        category: workflow.category,
        trigger_type: workflow.trigger_type,
        trigger_config: workflow.trigger_config || {},
        workflow_steps: Array.isArray(workflow.workflow_steps)
          ? workflow.workflow_steps.map((step: any, index: number) => ({
              id: step.id || `step-${index}`,
              type: step.type || "send_email",
              name: step.name || `Step ${index + 1}`,
              config: step.config || {},
              enabled: step.enabled !== false,
            }))
          : [],
        enabled: workflow.enabled,
      })
    }
  }, [workflow])

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      type: "send_email",
      name: `Step ${formData.workflow_steps.length + 1}`,
      config: {},
      enabled: true,
    }
    setFormData((prev) => ({
      ...prev,
      workflow_steps: [...prev.workflow_steps, newStep],
    }))
  }

  const removeStep = (stepId: string) => {
    setFormData((prev) => ({
      ...prev,
      workflow_steps: prev.workflow_steps.filter((step) => step.id !== stepId),
    }))
  }

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setFormData((prev) => ({
      ...prev,
      workflow_steps: prev.workflow_steps.map((step) => (step.id === stepId ? { ...step, ...updates } : step)),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const getStepIcon = (type: string) => {
    const stepType = STEP_TYPES.find((t) => t.value === type)
    return stepType?.icon || Zap
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workflow Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter workflow name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value: any) => setFormData((prev) => ({ ...prev, category: value }))}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stream">Stream</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what this workflow does"
            rows={3}
          />
        </div>
      </div>

      <Separator />

      {/* Trigger Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Trigger</h3>
        <div className="space-y-2">
          <Label htmlFor="trigger">When should this workflow run?</Label>
          <Select
            value={formData.trigger_type}
            onValueChange={(value: any) => setFormData((prev) => ({ ...prev, trigger_type: value }))}
          >
            <SelectTrigger id="trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_TYPES.map((trigger) => (
                <SelectItem key={trigger.value} value={trigger.value}>
                  {trigger.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.trigger_type === "schedule" && (
          <div className="space-y-2">
            <Label htmlFor="schedule">Schedule (Cron Expression)</Label>
            <Input
              id="schedule"
              placeholder="0 9 * * * (Every day at 9 AM)"
              value={formData.trigger_config.cron || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  trigger_config: { ...prev.trigger_config, cron: e.target.value },
                }))
              }
            />
          </div>
        )}

        {formData.trigger_type === "event" && (
          <div className="space-y-2">
            <Label htmlFor="event">Event Type</Label>
            <Select
              value={formData.trigger_config.event || ""}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  trigger_config: { ...prev.trigger_config, event: value },
                }))
              }
            >
              <SelectTrigger id="event">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stream_started">Stream Started</SelectItem>
                <SelectItem value="stream_ended">Stream Ended</SelectItem>
                <SelectItem value="order_created">Order Created</SelectItem>
                <SelectItem value="order_completed">Order Completed</SelectItem>
                <SelectItem value="product_low_stock">Product Low Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Separator />

      {/* Workflow Steps */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Workflow Steps</h3>
          <Button type="button" onClick={addStep} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Step
          </Button>
        </div>

        {formData.workflow_steps.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
            <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No steps added yet</p>
            <Button type="button" onClick={addStep} variant="outline" className="mt-2 bg-transparent">
              Add First Step
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {formData.workflow_steps.map((step, index) => {
              const StepIcon = getStepIcon(step.type)
              return (
                <Card key={step.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <StepIcon className="h-4 w-4" />
                        <CardTitle className="text-sm">
                          Step {index + 1}: {step.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {STEP_TYPES.find((t) => t.value === step.type)?.label || step.type}
                        </Badge>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeStep(step.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Step Type</Label>
                        <Select value={step.type} onValueChange={(value) => updateStep(step.id, { type: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STEP_TYPES.map((stepType) => (
                              <SelectItem key={stepType.value} value={stepType.value}>
                                <div className="flex items-center gap-2">
                                  <stepType.icon className="h-4 w-4" />
                                  {stepType.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Step Name</Label>
                        <Input
                          value={step.name}
                          onChange={(e) => updateStep(step.id, { name: e.target.value })}
                          placeholder="Enter step name"
                        />
                      </div>
                    </div>

                    {/* Step-specific configuration */}
                    {step.type === "send_email" && (
                      <div className="space-y-2">
                        <Label>Email Template</Label>
                        <Select
                          value={step.config.template || ""}
                          onValueChange={(value) =>
                            updateStep(step.id, {
                              config: { ...step.config, template: value },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="welcome">Welcome Email</SelectItem>
                            <SelectItem value="thank_you">Thank You Email</SelectItem>
                            <SelectItem value="low_stock">Low Stock Alert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {step.type === "wait" && (
                      <div className="space-y-2">
                        <Label>Wait Duration</Label>
                        <Input
                          value={step.config.duration || ""}
                          onChange={(e) =>
                            updateStep(step.id, {
                              config: { ...step.config, duration: e.target.value },
                            })
                          }
                          placeholder="e.g., 5m, 1h, 1d"
                        />
                      </div>
                    )}

                    {step.type === "webhook" && (
                      <div className="space-y-2">
                        <Label>Webhook URL</Label>
                        <Input
                          value={step.config.url || ""}
                          onChange={(e) =>
                            updateStep(step.id, {
                              config: { ...step.config, url: e.target.value },
                            })
                          }
                          placeholder="https://example.com/webhook"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{workflow ? "Update Workflow" : "Create Workflow"}</Button>
      </div>
    </form>
  )
}
