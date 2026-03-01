import { NextResponse } from "next/server"
import { z } from "zod"
import { createConnector, listConnectors } from "@/lib/mcp/connectors-store"

const createSchema = z.object({
  serverName: z.string().trim().min(1),
  endpoint: z.string().trim().url(),
  transport: z.enum(["http", "sse", "stdio"]),
  auth: z
    .object({
      type: z.enum(["none", "bearer", "api_key", "oauth"]).default("none"),
      headerName: z.string().trim().optional(),
      tokenRef: z.string().trim().optional(),
    })
    .optional(),
  enabledTools: z.array(z.string().trim().min(1)).default([]),
  enabled: z.boolean().default(true),
  permissions: z
    .object({
      allowAllUsers: z.boolean().default(true),
      allowedUserIds: z.array(z.string().trim().min(1)).default([]),
      allowedRoles: z.array(z.string().trim().min(1)).default([]),
    })
    .optional(),
})

export async function GET() {
  return NextResponse.json({ connectors: listConnectors() })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid connector payload", details: parsed.error.flatten() }, { status: 400 })
  }

  const connector = createConnector(parsed.data)
  return NextResponse.json({ connector }, { status: 201 })
}
