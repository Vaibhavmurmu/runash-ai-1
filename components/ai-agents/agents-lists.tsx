"use client"

import type { AIAgent } from "@/lib/hooks/use-ai-agents"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Bot, MessageSquare, ShoppingCart, BarChart3, Settings, ExternalLink } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface AgentsListProps {
  agents: AIAgent[]
  isLoading: boolean
  onSelect: (id: string) => void
  onToggleStatus: (id: string, enabled: boolean) => void
}

export function AgentsList({ agents, isLoading, onSelect, onToggleStatus }: AgentsListProps) {
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

  const getAgentTypeBadge = (type: AIAgent["type"]) => {
    switch (type) {
      case "sales":
        return (
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            Sales
          </Badge>
        )
      case "engagement":
        return (
          <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">
            Engagement
          </Badge>
        )
      case "analytics":
        return (
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            Analytics
          </Badge>
        )
      case "moderation":
        return (
          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
            Moderation
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Skeleton className="h-4 w-full mb-3" />
                <Skeleton className="h-4 w-3/4 mb-6" />
                <Skeleton className="h-2 w-full mb-2" />
                <div className="flex items-center justify-between mt-4">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    )
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Bot className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No agents found</h3>
        <p className="text-muted-foreground mt-2 mb-6 max-w-md">
          You haven't created any AI agents yet. Create your first agent to automate tasks during your live streams.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <Card key={agent.id} className={`overflow-hidden transition-all ${!agent.enabled ? "opacity-75" : ""}`}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">{getAgentIcon(agent.type)}</div>
                <div>
                  <h3 className="font-medium">{agent.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getAgentTypeBadge(agent.type)}
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)} mr-1.5`} />
                      <span className="text-xs text-muted-foreground capitalize">{agent.status}</span>
                    </div>
                  </div>
                </div>
              </div>
              <Switch checked={agent.enabled} onCheckedChange={(checked) => onToggleStatus(agent.id, checked)} />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {agent.enabled && (
              <>
                <div className="space-y-2 mt-3">
                  <div className="flex justify-between text-xs">
                    <span>Performance</span>
                    <span>{agent.performance_score}%</span>
                  </div>
                  <Progress value={agent.performance_score} className="h-1" />
                </div>

                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tasks completed</span>
                    <span className="font-medium">{agent.tasks_completed}</span>
                  </div>
                  {agent.current_task && <div className="text-muted-foreground">Current: {agent.current_task}</div>}
                </div>
              </>
            )}

            {!agent.enabled && (
              <div className="py-4 text-center text-sm text-muted-foreground">This agent is currently disabled</div>
            )}
          </CardContent>
          <CardFooter className="p-4 pt-0 flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => onSelect(agent.id)}>
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Logs
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
