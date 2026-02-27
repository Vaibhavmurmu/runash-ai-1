import { canInvokeConnector, getConnectorById, listConnectors, recordMcpAudit, type MpcConnectorConfig } from "@/lib/mcp/connectors-store"

export type MpcDiscoveredTool = {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export type MpcToolCallResult = {
  connectorId: string
  connectorName: string
  toolName: string
  success: boolean
  result?: unknown
  fallback: boolean
  message: string
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 2500) {
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutHandle)
  }
}

function createHeaders(connector: MpcConnectorConfig) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  }

  if (connector.auth.type === "bearer" && connector.auth.tokenRef) {
    headers.authorization = `Bearer ${connector.auth.tokenRef}`
  }

  if (connector.auth.type === "api_key" && connector.auth.tokenRef) {
    headers[connector.auth.headerName || "x-api-key"] = connector.auth.tokenRef
  }

  return headers
}

export async function discoverConnectorTools(connectorId: string) {
  const connector = getConnectorById(connectorId)
  if (!connector) {
    throw new Error("Connector not found")
  }

  if (!connector.enabled) {
    return connector.enabledTools.map((name) => ({ name, description: "Configured tool (connector disabled)" }))
  }

  if (connector.transport !== "http") {
    return connector.enabledTools.map((name) => ({ name, description: "Configured tool" }))
  }

  try {
    const response = await fetchWithTimeout(`${connector.endpoint.replace(/\/$/, "")}/tools`, {
      method: "GET",
      headers: createHeaders(connector),
    })

    if (!response.ok) {
      throw new Error(`Tool discovery failed with ${response.status}`)
    }

    const payload = (await response.json()) as { tools?: MpcDiscoveredTool[] }
    const discovered = payload.tools?.filter((tool) => !!tool.name) ?? []

    return discovered.length > 0
      ? discovered
      : connector.enabledTools.map((name) => ({ name, description: "Configured tool" }))
  } catch {
    return connector.enabledTools.map((name) => ({ name, description: "Configured tool (fallback)" }))
  }
}

export async function checkConnectorHealth(connectorId: string) {
  const connector = getConnectorById(connectorId)
  if (!connector) {
    throw new Error("Connector not found")
  }

  if (!connector.enabled) {
    return { status: "disabled" as const, latencyMs: null, detail: "Connector disabled" }
  }

  const start = Date.now()

  try {
    if (connector.transport !== "http") {
      return { status: "unknown" as const, latencyMs: Date.now() - start, detail: "Transport health not probeable" }
    }

    const response = await fetchWithTimeout(`${connector.endpoint.replace(/\/$/, "")}/health`, {
      method: "GET",
      headers: createHeaders(connector),
    })

    if (!response.ok) {
      return {
        status: "degraded" as const,
        latencyMs: Date.now() - start,
        detail: `Health check returned ${response.status}`,
      }
    }

    return { status: "healthy" as const, latencyMs: Date.now() - start, detail: "Health endpoint responded" }
  } catch {
    return { status: "offline" as const, latencyMs: Date.now() - start, detail: "Health check failed" }
  }
}

function pickConnectorForTool(toolName: string) {
  return listConnectors().find((connector) => connector.enabled && connector.enabledTools.includes(toolName)) ?? null
}

export async function invokeToolOnMcpConnector(input: {
  toolName: string
  args?: Record<string, unknown>
  actor?: { userId?: string | null; roles?: string[] }
}) {
  const connector = pickConnectorForTool(input.toolName)
  if (!connector) {
    return {
      connectorId: "",
      connectorName: "none",
      toolName: input.toolName,
      success: false,
      fallback: true,
      message: "No connector available for tool",
    } satisfies MpcToolCallResult
  }

  if (!canInvokeConnector(connector, input.actor ?? {})) {
    recordMcpAudit({
      connectorId: connector.id,
      connectorName: connector.serverName,
      toolName: input.toolName,
      status: "denied",
      actorUserId: input.actor?.userId,
      actorRoles: input.actor?.roles,
      detail: "Permission policy blocked connector invocation",
    })

    return {
      connectorId: connector.id,
      connectorName: connector.serverName,
      toolName: input.toolName,
      success: false,
      fallback: true,
      message: "Connector permission denied",
    } satisfies MpcToolCallResult
  }

  const start = Date.now()

  try {
    if (connector.transport !== "http") {
      throw new Error("Only HTTP MCP connectors are currently supported for invocation")
    }

    const response = await fetchWithTimeout(`${connector.endpoint.replace(/\/$/, "")}/tools/call`, {
      method: "POST",
      headers: createHeaders(connector),
      body: JSON.stringify({ toolName: input.toolName, args: input.args ?? {} }),
    })

    if (!response.ok) {
      throw new Error(`Tool call failed with status ${response.status}`)
    }

    const payload = await response.json()
    recordMcpAudit({
      connectorId: connector.id,
      connectorName: connector.serverName,
      toolName: input.toolName,
      status: "success",
      actorUserId: input.actor?.userId,
      actorRoles: input.actor?.roles,
      latencyMs: Date.now() - start,
      detail: "Tool call completed",
    })

    return {
      connectorId: connector.id,
      connectorName: connector.serverName,
      toolName: input.toolName,
      success: true,
      fallback: false,
      result: payload,
      message: "MCP tool call succeeded",
    } satisfies MpcToolCallResult
  } catch {
    recordMcpAudit({
      connectorId: connector.id,
      connectorName: connector.serverName,
      toolName: input.toolName,
      status: "fallback",
      actorUserId: input.actor?.userId,
      actorRoles: input.actor?.roles,
      latencyMs: Date.now() - start,
      detail: "Connector unavailable; fallback path used",
    })

    return {
      connectorId: connector.id,
      connectorName: connector.serverName,
      toolName: input.toolName,
      success: false,
      fallback: true,
      message: "Connector unavailable, fallback path used",
    } satisfies MpcToolCallResult
  }
}
