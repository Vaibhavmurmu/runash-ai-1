"use client"

import { useState } from "react"
import type { QuickAction } from "@/types/runash-chat"

import QuickActions from "@/components/chat/quick-actions"
import { RunAshChatFeatureGrid } from "@/components/chat/runash-chat-feature-grid"
import { RunAshChatTaskBoard } from "@/components/chat/runash-chat-task-board"
import { Button } from "@/components/ui/button"
import { MCPServerManager, type ChatMcpServer } from "@/components/chat/mcp-server-manager"

export const MCP_MANAGER_ENABLED = process.env.NEXT_PUBLIC_RUNASH_CHAT_MCP_MANAGER_ENABLED !== "false"
export const MCP_TOOL_ENDPOINTS_AVAILABLE = process.env.NEXT_PUBLIC_RUNASH_CHAT_MCP_ENDPOINTS_AVAILABLE !== "false"

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
  const enabledServerCount = mcpServers.filter((server) => server.enabled).length

  return (
    <div className="space-y-3">
      <QuickActions actions={quickActions} />
      <RunAshChatFeatureGrid onSelect={onSelectPrompt} />
      <RunAshChatTaskBoard onRunTask={onSelectPrompt} />

      {MCP_MANAGER_ENABLED ? (
        <>
          <div className="rounded-lg border bg-card p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Chat settings · MCP tools</p>
                <p className="text-xs text-muted-foreground">
                  Configure external MCP/tool servers used by chat automations.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!MCP_TOOL_ENDPOINTS_AVAILABLE}
                onClick={() => setMcpDialogOpen(true)}
              >
                Open tool server manager
              </Button>
            </div>

            {MCP_TOOL_ENDPOINTS_AVAILABLE ? (
              <p className="text-xs text-muted-foreground">
                {enabledServerCount} of {mcpServers.length} servers enabled
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tool servers are temporarily unavailable. Chat will safely continue with built-in responses until MCP
                endpoints recover.
              </p>
            )}
          </div>

          {MCP_TOOL_ENDPOINTS_AVAILABLE ? (
            <MCPServerManager
              open={mcpDialogOpen}
              onOpenChange={setMcpDialogOpen}
              servers={mcpServers}
              onServersChange={setMcpServers}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
