"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type Template = {
  id: string
  name: string
  description?: string | null
  preset_key?: string | null
  channels: Array<"email" | "push" | "chat">
}

type WorkflowRule = {
  id: string
  name: string
  trigger_type: "stream_ended" | "cart_abandoned" | "high_intent_viewer" | "repeat_buyer"
  channels: Array<"email" | "push" | "chat">
  is_active: boolean
}

const triggerLabels: Record<WorkflowRule["trigger_type"], string> = {
  stream_ended: "Stream ended",
  cart_abandoned: "Cart abandoned",
  high_intent_viewer: "High-intent viewer",
  repeat_buyer: "Repeat buyer",
}

export function MarketingWorkflowBuilder() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [selectedTrigger, setSelectedTrigger] = useState<WorkflowRule["trigger_type"]>("cart_abandoned")
  const [workflowName, setWorkflowName] = useState("")

  const { data: templatesData } = useSWR<{ data?: Template[] }>("/api/seller/marketing-workflows?type=templates", fetcher)
  const { data: rulesData, mutate } = useSWR<{ data?: WorkflowRule[] }>("/api/seller/marketing-workflows", fetcher)

  const templates = templatesData?.data ?? []
  const rules = rulesData?.data ?? []

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId), [templates, selectedTemplateId])

  async function createWorkflowFromPreset() {
    if (!selectedTemplate) return

    await fetch("/api/seller/marketing-workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: workflowName || `${selectedTemplate.name} Flow`,
        trigger_type: selectedTrigger,
        template_id: selectedTemplate.id.startsWith("system-") ? null : selectedTemplate.id,
        channels: selectedTemplate.channels,
        conditions: {},
      }),
    })

    setWorkflowName("")
    void mutate()
  }

  async function toggleActivation(rule: WorkflowRule) {
    await fetch(`/api/seller/marketing-workflows/${rule.id}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !rule.is_active }),
    })

    void mutate()
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Workflow Builder</CardTitle>
          <CardDescription>Use presets to launch welcome, promo, recovery, and upsell automations.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Preset</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select preset" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Trigger</Label>
            <Select value={selectedTrigger} onValueChange={(value) => setSelectedTrigger(value as WorkflowRule["trigger_type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(triggerLabels) as WorkflowRule["trigger_type"][]).map((trigger) => (
                  <SelectItem key={trigger} value={trigger}>
                    {triggerLabels[trigger]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Workflow name</Label>
            <Input value={workflowName} onChange={(event) => setWorkflowName(event.target.value)} placeholder="Optional custom name" />
          </div>

          <div className="flex items-end">
            <Button className="w-full" onClick={createWorkflowFromPreset} disabled={!selectedTemplateId}>
              Create workflow
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Active marketing workflows</CardTitle>
          <CardDescription>Activate or pause channel orchestration for each trigger flow.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-lg border p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{rule.name}</p>
                <p className="text-sm text-muted-foreground">Trigger: {triggerLabels[rule.trigger_type]}</p>
                <div className="flex gap-2 mt-2">
                  {rule.channels.map((channel) => (
                    <Badge key={channel} variant="secondary">
                      {channel}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button variant={rule.is_active ? "outline" : "default"} onClick={() => toggleActivation(rule)}>
                {rule.is_active ? "Pause" : "Activate"}
              </Button>
            </div>
          ))}

          {rules.length === 0 ? <p className="text-sm text-muted-foreground">No workflows created yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
