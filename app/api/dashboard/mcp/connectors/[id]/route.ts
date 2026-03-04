import { NextResponse } from "next/server"
import { z } from "zod"
import { deleteConnector, getConnectorById, updateConnector } from "@/lib/mcp/connectors-store"

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

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const connector = getConnectorById(id)
  if (!connector) {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 })
  }

  return NextResponse.json({ connector })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid patch payload", details: parsed.error.flatten() }, { status: 400 })
  }

  const connector = updateConnector(id, parsed.data)
  if (!connector) {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 })
  }

  return NextResponse.json({ connector })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const deleted = deleteConnector(id)
  if (!deleted) {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
