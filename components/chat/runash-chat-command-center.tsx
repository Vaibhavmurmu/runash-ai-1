"use client"

import { useState } from "react"
import type { QuickAction } from "@/types/runash-chat"

import QuickActions from "@/components/chat/quick-actions"
import { RunAshChatFeatureGrid } from "@/components/chat/runash-chat-feature-grid"
import { RunAshChatTaskBoard } from "@/components/chat/runash-chat-task-board"
import { Button } from "@/components/ui/button"
import { MCPServerManager, type ChatMcpServer } from "@/components/chat/mcp-server-manager"

const MCP_MANAGER_ENABLED = process.env.NEXT_PUBLIC_RUNASH_CHAT_MCP_MANAGER_ENABLED !== "false"

const defaultMcpServers: ChatMcpServer[] = [
  {
    id: "catalog-search",
    name: "Catalog Search",
    endpoint: "https://mcp.runash.ai/catalog",
    enabled: true,
  },
  {
    id: "pricing-intel",
    name: "Pricing Intel",
    endpoint: "https://mcp.runash.ai/pricing",
    enabled: false,
  },
]

export function RunAshChatCommandCenter({
  quickActions,
  onSelectPrompt,
}: {
  quickActions: QuickAction[]
  onSelectPrompt: (prompt: string) => void
}) {
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false)
  const [mcpServers, setMcpServers] = useState<ChatMcpServer[]>(defaultMcpServers)

  return (
    <div className="space-y-3">
      <QuickActions actions={quickActions} />
      <RunAshChatFeatureGrid onSelect={onSelectPrompt} />
      <RunAshChatTaskBoard onRunTask={onSelectPrompt} />

      {MCP_MANAGER_ENABLED ? (
        <>
          <div className="rounded-lg border bg-card p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">MCP tools</p>
              <Button size="sm" variant="outline" onClick={() => setMcpDialogOpen(true)}>
                Manage servers
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {mcpServers.filter((server) => server.enabled).length} of {mcpServers.length} servers enabled
            </p>
          </div>

          <MCPServerManager
            open={mcpDialogOpen}
            onOpenChange={setMcpDialogOpen}
            servers={mcpServers}
            onServersChange={setMcpServers}
          />
        </>
      ) : null}
    </div>
  )
}
