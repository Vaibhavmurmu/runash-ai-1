"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type ChatMcpServer = {
  id: string
  name: string
  endpoint: string
  enabled: boolean
}

type MCPServerManagerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  servers: ChatMcpServer[]
  onServersChange: (servers: ChatMcpServer[]) => void
}

type MCPServerManagerContentProps = {
  servers: ChatMcpServer[]
  onServersChange: (servers: ChatMcpServer[]) => void
}

const emptyDraft = { name: "", endpoint: "" }

export function MCPServerManagerContent({ servers, onServersChange }: MCPServerManagerContentProps) {
  const [draft, setDraft] = useState(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)

  const submitLabel = editingId ? "Save changes" : "Add server"

  const sortedServers = useMemo(
    () => [...servers].sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name)),
    [servers],
  )

  const resetDraft = () => {
    setDraft(emptyDraft)
    setEditingId(null)
  }

  const upsertServer = () => {
    const name = draft.name.trim()
    const endpoint = draft.endpoint.trim()

    if (!name || !endpoint) return

    if (editingId) {
      onServersChange(
        servers.map((server) =>
          server.id === editingId
            ? {
                ...server,
                name,
                endpoint,
              }
            : server,
        ),
      )
    } else {
      onServersChange([
        ...servers,
        {
          id: `mcp-${Date.now()}`,
          name,
          endpoint,
          enabled: true,
        },
      ])
    }

    resetDraft()
  }

  const startEditing = (id: string) => {
    const target = servers.find((server) => server.id === id)
    if (!target) return

    setEditingId(id)
    setDraft({
      name: target.name,
      endpoint: target.endpoint,
    })
  }

  const toggleEnabled = (id: string) => {
    onServersChange(
      servers.map((server) => (server.id === id ? { ...server, enabled: !server.enabled } : server)),
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="space-y-1">
          <Label htmlFor="mcp-name">Server name</Label>
          <Input
            id="mcp-name"
            placeholder="Inventory tools"
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mcp-endpoint">Endpoint</Label>
          <Input
            id="mcp-endpoint"
            placeholder="https://mcp.example.com"
            value={draft.endpoint}
            onChange={(event) => setDraft((prev) => ({ ...prev, endpoint: event.target.value }))}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={upsertServer}>{submitLabel}</Button>
          {editingId ? (
            <Button variant="outline" onClick={resetDraft}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {sortedServers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No MCP servers configured yet.</p>
        ) : (
          sortedServers.map((server) => (
            <div key={server.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{server.name}</p>
                <p className="text-xs text-muted-foreground">{server.endpoint}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => startEditing(server.id)}>
                  Edit
                </Button>
                <Button size="sm" variant={server.enabled ? "secondary" : "default"} onClick={() => toggleEnabled(server.id)}>
                  {server.enabled ? "Disable" : "Enable"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function MCPServerManager({ open, onOpenChange, servers, onServersChange }: MCPServerManagerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>MCP server manager</DialogTitle>
          <DialogDescription>Add, edit, enable, and disable chat MCP servers.</DialogDescription>
        </DialogHeader>
        <MCPServerManagerContent servers={servers} onServersChange={onServersChange} />
      </DialogContent>
    </Dialog>
  )
}
