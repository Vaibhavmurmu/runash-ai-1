"use client"

import { useEffect, useState } from "react"
import type { Workflow, WorkflowExecution, WorkflowTemplate } from "@/lib/repositories/automation"

export type { Workflow, WorkflowExecution, WorkflowTemplate }

export interface WorkflowStep {
  id: string
  type: string
  name: string
  config: Record<string, any>
  enabled: boolean
}

export interface WorkflowTrigger {
  type: "manual" | "schedule" | "event" | "webhook"
  config: Record<string, any>
}

export function useWorkflows(userId?: string) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      fetchWorkflows()
      fetchTemplates()
      fetchExecutions()
    }
  }, [userId])

  const fetchWorkflows = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/automation/workflows?userId=${userId}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setWorkflows(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`/api/automation/workflows?type=templates`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setTemplates(json.data || [])
    } catch (err) {
      console.error("Error fetching templates:", err)
    }
  }

  const fetchExecutions = async () => {
    try {
      const res = await fetch(`/api/automation/executions?userId=${userId}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setExecutions(json.data || [])
    } catch (err) {
      console.error("Error fetching executions:", err)
    }
  }

  const createWorkflow = async (workflowData: Partial<Workflow>) => {
    try {
      const res = await fetch("/api/automation/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...workflowData, user_id: userId }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setWorkflows((prev) => [json.data, ...prev])
      return { data: json.data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : "An error occurred" }
    }
  }

  const updateWorkflow = async (id: string, updates: Partial<Workflow>) => {
    try {
      const res = await fetch(`/api/automation/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, user_id: userId }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setWorkflows((prev) => prev.map((w) => (w.id === id ? json.data : w)))
      return { data: json.data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : "An error occurred" }
    }
  }

  const deleteWorkflow = async (id: string) => {
    try {
      const res = await fetch(`/api/automation/workflows/${id}?userId=${userId}`, { method: "DELETE" })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : "An error occurred" }
    }
  }

  const executeWorkflow = async (id: string, inputData?: Record<string, any>) => {
    try {
      const res = await fetch(`/api/automation/workflows/${id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, input_data: inputData || {} }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      await fetchExecutions()
      return { data: json.data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : "An error occurred" }
    }
  }

  const toggleWorkflow = async (id: string, enabled: boolean) => {
    return updateWorkflow(id, { enabled, status: enabled ? "active" : "paused" })
  }

  const createFromTemplate = async (templateId: string, customizations?: Partial<Workflow>) => {
    try {
      const template = templates.find((t) => t.id === templateId)
      if (!template) throw new Error("Template not found")

      const templateData = template.template_data as any
      const workflowData: Partial<Workflow> = {
        name: customizations?.name || template.name,
        description: customizations?.description || template.description,
        category: template.category,
        trigger_type: templateData.trigger?.type || "manual",
        trigger_config: templateData.trigger?.config || {},
        workflow_steps: templateData.steps || [],
        ...customizations,
      }

      return await createWorkflow(workflowData)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : "An error occurred" }
    }
  }

  return {
    workflows,
    templates,
    executions,
    loading,
    error,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
    toggleWorkflow,
    createFromTemplate,
    refetch: fetchWorkflows,
  }
}
