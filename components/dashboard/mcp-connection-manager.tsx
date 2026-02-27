"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Connector = {
  id: string
  serverName: string
  endpoint: string
  transport: "http" | "sse" | "stdio"
  auth: { type: "none" | "bearer" | "api_key" | "oauth"; headerName?: string; tokenRef?: string }
  enabledTools: string[]
  enabled: boolean
  permissions: { allowAllUsers: boolean; allowedUserIds: string[]; allowedRoles: string[] }
}

type AuditRecord = {
  id: string
  connectorName: string
  toolName: string
  status: string
  detail?: string
  createdAt: string
}

const defaultForm = {
  serverName: "",
  endpoint: "",
  transport: "http" as const,
  enabledTools: "catalog_lookup",
  tokenRef: "",
}

export function MpcConnectionManager() {
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [audit, setAudit] = useState<AuditRecord[]>([])
  const [toolsByConnector, setToolsByConnector] = useState<Record<string, string[]>>({})
  const [healthByConnector, setHealthByConnector] = useState<Record<string, string>>({})
  const [form, setForm] = useState(defaultForm)

  const refreshData = useCallback(async () => {
    const [connectorsResponse, auditResponse] = await Promise.all([
      fetch("/api/dashboard/mcp/connectors", { cache: "no-store" }),
      fetch("/api/dashboard/mcp/audit?limit=20", { cache: "no-store" }),
    ])

    const connectorsJson = await connectorsResponse.json()
    const auditJson = await auditResponse.json()
    setConnectors(connectorsJson.connectors ?? [])
    setAudit(auditJson.audit ?? [])
  }, [])

  useEffect(() => {
    void refreshData()
  }, [refreshData])

  const createConnector = async () => {
    await fetch("/api/dashboard/mcp/connectors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        serverName: form.serverName,
        endpoint: form.endpoint,
        transport: form.transport,
        auth: form.tokenRef ? { type: "bearer", tokenRef: form.tokenRef } : { type: "none" },
        enabledTools: form.enabledTools
          .split(",")
          .map((tool) => tool.trim())
          .filter(Boolean),
      }),
    })

    setForm(defaultForm)
    await refreshData()
  }

  const runDiscovery = async (id: string) => {
    const response = await fetch(`/api/dashboard/mcp/connectors/${id}/discover`, { cache: "no-store" })
    const payload = await response.json()
    setToolsByConnector((prev) => ({
      ...prev,
      [id]: (payload.tools ?? []).map((tool: { name: string }) => tool.name),
    }))
  }

  const runHealthCheck = async (id: string) => {
    const response = await fetch(`/api/dashboard/mcp/connectors/${id}/health`, { cache: "no-store" })
    const payload = await response.json()
    setHealthByConnector((prev) => ({ ...prev, [id]: payload.health?.status ?? "unknown" }))
  }

  const togglePermissionMode = async (connector: Connector) => {
    await fetch(`/api/dashboard/mcp/connectors/${connector.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        permissions: {
          allowAllUsers: !connector.permissions.allowAllUsers,
          allowedRoles: connector.permissions.allowAllUsers ? ["admin"] : [],
          allowedUserIds: [],
        },
      }),
    })

    await refreshData()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>MCP connector configuration</CardTitle>
          <CardDescription>Store server transport/auth metadata, enabled tools, and permission policy.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Server name" value={form.serverName} onChange={(event) => setForm((prev) => ({ ...prev, serverName: event.target.value }))} />
          <Input placeholder="Endpoint URL" value={form.endpoint} onChange={(event) => setForm((prev) => ({ ...prev, endpoint: event.target.value }))} />
          <Input placeholder="Enabled tools (comma-separated)" value={form.enabledTools} onChange={(event) => setForm((prev) => ({ ...prev, enabledTools: event.target.value }))} />
          <Input placeholder="Optional bearer token reference" value={form.tokenRef} onChange={(event) => setForm((prev) => ({ ...prev, tokenRef: event.target.value }))} />
          <div className="md:col-span-2">
            <Button onClick={createConnector}>Save connector</Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4">
        {connectors.map((connector) => (
          <Card key={connector.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {connector.serverName}
                <Badge variant={connector.enabled ? "secondary" : "outline"}>{connector.transport}</Badge>
              </CardTitle>
              <CardDescription>{connector.endpoint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Enabled tools: {connector.enabledTools.join(", ") || "none"}</p>
              <p>Permission mode: {connector.permissions.allowAllUsers ? "All users" : "Restricted"}</p>
              <p>Health: {healthByConnector[connector.id] ?? "Not checked"}</p>
              <p>Discovered tools: {(toolsByConnector[connector.id] ?? []).join(", ") || "Not discovered"}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => runDiscovery(connector.id)}>
                  Discover tools
                </Button>
                <Button size="sm" variant="outline" onClick={() => runHealthCheck(connector.id)}>
                  Health check
                </Button>
                <Button size="sm" variant="ghost" onClick={() => togglePermissionMode(connector)}>
                  Toggle permissions
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>MCP call audit log</CardTitle>
          <CardDescription>Tracks permission decisions, runtime calls, and fallback events.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {audit.length === 0 && <p className="text-muted-foreground">No MCP calls recorded yet.</p>}
          {audit.map((record) => (
            <div key={record.id} className="rounded border border-border/60 p-2">
              <p className="font-medium">
                {record.connectorName} → {record.toolName} ({record.status})
              </p>
              <p className="text-muted-foreground">{record.detail ?? "No details"}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
