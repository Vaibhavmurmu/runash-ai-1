import { NextResponse } from "next/server"
import { z } from "zod"
import { canManageMcpConnectors, requireDashboardTenantContext } from "@/app/api/dashboard/_auth"
import { deleteConnector, getConnectorById, recordMcpAudit, updateConnector } from "@/lib/mcp/connectors-store"

const patchSchema = z.object({
  serverName: z.string().trim().min(1).optional(),
  endpoint: z.string().trim().url().optional(),
  transport: z.enum(["http", "sse", "stdio"]).optional(),
  auth: z
    .object({
      type: z.enum(["none", "bearer", "api_key", "oauth"]).optional(),
      headerName: z.string().trim().optional(),
      tokenRef: z.string().trim().optional(),
    })
    .optional(),
  enabledTools: z.array(z.string().trim().min(1)).optional(),
  enabled: z.boolean().optional(),
  permissions: z
    .object({
      allowAllUsers: z.boolean().optional(),
      allowedUserIds: z.array(z.string().trim().min(1)).optional(),
      allowedRoles: z.array(z.string().trim().min(1)).optional(),
    })
    .optional(),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireDashboardTenantContext(request)
  if (context instanceof Response) return context

  const { id } = await params

  try {
    const connector = await getConnectorById(id, { tenantId: context.tenantId })
    if (!connector) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 })
    }

    return NextResponse.json({ connector })
  } catch {
    return NextResponse.json({ error: "Failed to load connector" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireDashboardTenantContext(request)
  if (context instanceof Response) return context
  const { id } = await params
  if (!canManageMcpConnectors(context)) {
    await recordMcpAudit(
      {
        connectorId: id,
        connectorName: "mcp-config",
        toolName: "connector.update",
        status: "denied",
        actorUserId: context.userId,
        actorRoles: [context.role],
        detail: "Connector update forbidden by role policy",
      },
      { tenantId: context.tenantId },
    )
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const existingConnector = await getConnectorById(id, { tenantId: context.tenantId })
  if (!existingConnector) {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid patch payload", details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const connector = await updateConnector(id, parsed.data, { tenantId: context.tenantId })
    if (!connector) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 })
    }

    await recordMcpAudit(
      {
        connectorId: connector.id,
        connectorName: connector.serverName,
        toolName: "connector.update",
        status: "success",
        actorUserId: context.userId,
        actorRoles: [context.role],
        detail: "Connector updated",
      },
      { tenantId: context.tenantId },
    )

    return NextResponse.json({ connector })
  } catch {
    return NextResponse.json({ error: "Failed to update connector" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireDashboardTenantContext(request)
  if (context instanceof Response) return context
  const { id } = await params
  if (!canManageMcpConnectors(context)) {
    await recordMcpAudit(
      {
        connectorId: id,
        connectorName: "mcp-config",
        toolName: "connector.delete",
        status: "denied",
        actorUserId: context.userId,
        actorRoles: [context.role],
        detail: "Connector delete forbidden by role policy",
      },
      { tenantId: context.tenantId },
    )
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const existingConnector = await getConnectorById(id, { tenantId: context.tenantId })
  if (!existingConnector) {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 })
  }

  try {
    const deleted = await deleteConnector(id, { tenantId: context.tenantId })
    if (!deleted) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 })
    }

    await recordMcpAudit(
      {
        connectorId: existingConnector.id,
        connectorName: existingConnector.serverName,
        toolName: "connector.delete",
        status: "success",
        actorUserId: context.userId,
        actorRoles: [context.role],
        detail: "Connector deleted",
      },
      { tenantId: context.tenantId },
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete connector" }, { status: 500 })
  }
}
