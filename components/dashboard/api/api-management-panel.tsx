"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type ApiKey = {
  id: string
  name: string
  scopes: string[]
  status: "active" | "revoked"
  createdAt: string
  rotatedAt: string
  usage24h: number
  secretMasked: string
}

const ERROR_REFERENCE = [
  { code: "API_EXPLORER_INVALID_REQUEST", meaning: "Explorer payload is invalid", retry: "Fix fields and retry" },
  { code: "MODEL_DIALOG_INVALID_PROMPT_INPUT", meaning: "Model dialog context is missing fields", retry: "Provide required dataset/library fields" },
  { code: "USAGE_LIMIT_REACHED", meaning: "Provider quota exhausted", retry: "Wait for quota reset or switch model/provider" },
  { code: "MODEL_DIALOG_PROVIDER_DOWN", meaning: "Provider unavailable", retry: "Retry with fallback provider" },
]

export function ApiManagementPanel() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [name, setName] = useState("")
  const [scopes, setScopes] = useState("analytics:read")
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [explorerEndpoint, setExplorerEndpoint] = useState("/api/chat")
  const [explorerMethod, setExplorerMethod] = useState("POST")
  const [explorerPayload, setExplorerPayload] = useState('{"message":"hello"}')
  const [explorerResponse, setExplorerResponse] = useState<string>("")

  const usageTotal = useMemo(() => keys.reduce((acc, item) => acc + item.usage24h, 0), [keys])

  const refreshKeys = async () => {
    const response = await fetch("/api/dashboard/api-keys", { cache: "no-store" })
    const payload = await response.json()
    setKeys(Array.isArray(payload.keys) ? payload.keys : [])
  }

  useEffect(() => {
    void refreshKeys()
  }, [])

  const handleCreate = async () => {
    const response = await fetch("/api/dashboard/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        scopes: scopes.split(",").map((scope) => scope.trim()).filter(Boolean),
      }),
    })

    const payload = await response.json()
    if (response.ok) {
      setName("")
      setScopes("analytics:read")
      setNewSecret(payload.plainTextSecret ?? null)
      await refreshKeys()
    }
  }

  const handleAction = async (id: string, action: "rotate" | "revoke") => {
    await fetch(`/api/dashboard/api-keys/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    })

    await refreshKeys()
  }

  const runExplorer = async () => {
    let parsedPayload: Record<string, unknown> | undefined

    try {
      parsedPayload = explorerPayload.trim() ? (JSON.parse(explorerPayload) as Record<string, unknown>) : undefined
    } catch {
      setExplorerResponse("Invalid JSON payload")
      return
    }

    const response = await fetch("/api/dashboard/api-explorer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method: explorerMethod, endpoint: explorerEndpoint, payload: parsedPayload }),
    })

    const payload = await response.json()
    setExplorerResponse(JSON.stringify(payload, null, 2))
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Keys</CardTitle>
            <CardDescription>Total managed API credentials</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{keys.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">24h usage</CardTitle>
            <CardDescription>Aggregated request volume</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{usageTotal.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active keys</CardTitle>
            <CardDescription>Non-revoked keys currently usable</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{keys.filter((item) => item.status === "active").length}</CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Create API key</CardTitle>
          <CardDescription>Create scoped keys for API management integrations.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Key name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input
            placeholder="Scopes (comma separated)"
            value={scopes}
            onChange={(event) => setScopes(event.target.value)}
          />
          <Button onClick={handleCreate}>Create key</Button>
          {newSecret ? (
            <p className="md:col-span-3 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
              Save this secret now: <code>{newSecret}</code>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key inventory</CardTitle>
          <CardDescription>List, revoke, rotate, and inspect key scopes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {keys.map((key) => (
            <div key={key.id} className="rounded border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{key.name}</p>
                <Badge variant={key.status === "active" ? "secondary" : "outline"}>{key.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{key.secretMasked}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {key.scopes.map((scope) => (
                  <Badge key={scope} variant="outline">{scope}</Badge>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleAction(key.id, "rotate")}>Rotate</Button>
                <Button size="sm" variant="ghost" onClick={() => handleAction(key.id, "revoke")}>Revoke</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endpoint explorer (safe simulation)</CardTitle>
          <CardDescription>Test method + endpoint payloads without live mutation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <select value={explorerMethod} onChange={(event) => setExplorerMethod(event.target.value)} className="rounded border bg-background px-2 py-2 text-sm">
              <option>GET</option>
              <option>POST</option>
              <option>PATCH</option>
              <option>DELETE</option>
            </select>
            <Input value={explorerEndpoint} onChange={(event) => setExplorerEndpoint(event.target.value)} />
            <Button onClick={runExplorer}>Run</Button>
          </div>
          <textarea
            className="min-h-[120px] w-full rounded border bg-background p-2 text-xs"
            value={explorerPayload}
            onChange={(event) => setExplorerPayload(event.target.value)}
          />
          <pre className="overflow-x-auto rounded border bg-muted/30 p-3 text-xs">{explorerResponse || "No response yet"}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Error-code reference</CardTitle>
          <CardDescription>Common API and model-dialog errors with retry guidance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {ERROR_REFERENCE.map((item) => (
            <div key={item.code} className="rounded border p-2">
              <p className="font-mono text-xs">{item.code}</p>
              <p>{item.meaning}</p>
              <p className="text-muted-foreground">Retry strategy: {item.retry}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
