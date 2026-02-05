"use client"

import type React from "react"

import { useState } from "react"
import type { AIAgent } from "@/lib/hooks/use-ai-agents"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Bot, MessageSquare, ShoppingCart, BarChart3, Settings, Activity, Trash2, Code } from "lucide-react"

interface AgentDetailDialogProps {
  agent: AIAgent
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (data: any) => void
  onDelete: () => void
}

export function AgentDetailDialog({ agent, open, onOpenChange, onUpdate, onDelete }: AgentDetailDialogProps) {
  const [formData, setFormData] = useState({
    name: agent.name,
    type: agent.type,
    description: agent.current_task || "",
    enabled: agent.enabled,
    status: agent.status,
    settings: agent.settings || {},
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("general")

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onUpdate(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getAgentIcon = (type: AIAgent["type"]) => {
    switch (type) {
      case "sales":
        return <ShoppingCart className="h-5 w-5" />
      case "engagement":
        return <MessageSquare className="h-5 w-5" />
      case "analytics":
        return <BarChart3 className="h-5 w-5" />
      case "moderation":
        return <Bot className="h-5 w-5" />
      default:
        return <Bot className="h-5 w-5" />
    }
  }

  const getStatusColor = (status: AIAgent["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "idle":
        return "bg-yellow-500"
      case "disabled":
        return "bg-gray-400"
      default:
        return "bg-gray-400"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">{getAgentIcon(agent.type)}</div>
              <div>
                <DialogTitle>{agent.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{agent.type.charAt(0).toUpperCase() + agent.type.slice(1)}</Badge>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)} mr-1.5`} />
                    <span className="text-xs text-muted-foreground capitalize">{agent.status}</span>
                  </div>
                </div>
              </div>
            </div>
            <DialogDescription className="mt-2">Configure your AI agent settings and behavior.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="general">
                <Settings className="h-4 w-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger value="behavior">
                <Code className="h-4 w-4 mr-2" />
                Behavior
              </TabsTrigger>
              <TabsTrigger value="performance">
                <Activity className="h-4 w-4 mr-2" />
                Performance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Agent Type</Label>
                <Select value={formData.type} onValueChange={(value) => handleChange("type", value)} required>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select agent type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">
                      <div className="flex items-center">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Sales
                      </div>
                    </SelectItem>
                    <SelectItem value="engagement">
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Engagement
                      </div>
                    </SelectItem>
                    <SelectItem value="analytics">
                      <div className="flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </div>
                    </SelectItem>
                    <SelectItem value="moderation">
                      <div className="flex items-center">
                        <Bot className="h-4 w-4 mr-2" />
                        Moderation
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enabled">Agent Status</Label>
                  <div className="text-sm text-muted-foreground">
                    {formData.enabled ? "Agent is active and running" : "Agent is currently disabled"}
                  </div>
                </div>
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => {
                    handleChange("enabled", checked)
                    handleChange("status", checked ? "active" : "disabled")
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="behavior" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Response Style</h4>
                  <Select
                    value={(formData.settings as any)?.responseStyle || "helpful"}
                    onValueChange={(value) => handleChange("settings", { ...formData.settings, responseStyle: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="helpful">Helpful & Informative</SelectItem>
                      <SelectItem value="concise">Concise & Direct</SelectItem>
                      <SelectItem value="friendly">Friendly & Conversational</SelectItem>
                      <SelectItem value="professional">Professional & Formal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Knowledge Base</h4>
                  <Select
                    value={(formData.settings as any)?.knowledgeBase || "products"}
                    onValueChange={(value) => handleChange("settings", { ...formData.settings, knowledgeBase: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select knowledge base" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="products">Product Catalog</SelectItem>
                      <SelectItem value="faq">FAQ Database</SelectItem>
                      <SelectItem value="policies">Policies & Procedures</SelectItem>
                      <SelectItem value="all">All Knowledge Bases</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Automation Level</h4>
                  <Select
                    value={(formData.settings as any)?.automationLevel || "medium"}
                    onValueChange={(value) =>
                      handleChange("settings", { ...formData.settings, automationLevel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select automation level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Requires Approval</SelectItem>
                      <SelectItem value="medium">Medium - Smart Assistance</SelectItem>
                      <SelectItem value="high">High - Full Automation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Performance Score</h4>
                  <Badge variant="outline">{agent.performance_score}%</Badge>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${agent.performance_score}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Tasks Completed</h4>
                <p className="text-2xl font-bold">{agent.tasks_completed}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recent Activity</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-2 rounded-md bg-muted">
                    <p className="font-medium">Answered product question</p>
                    <p className="text-muted-foreground text-xs">2 minutes ago</p>
                  </div>
                  <div className="p-2 rounded-md bg-muted">
                    <p className="font-medium">Moderated chat message</p>
                    <p className="text-muted-foreground text-xs">15 minutes ago</p>
                  </div>
                  <div className="p-2 rounded-md bg-muted">
                    <p className="font-medium">Generated product recommendation</p>
                    <p className="text-muted-foreground text-xs">1 hour ago</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-500 border-red-200 hover:bg-red-50 bg-transparent"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the AI agent and remove all associated
                    data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-red-500 hover:bg-red-600">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
