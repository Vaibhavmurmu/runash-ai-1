import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { deactivateScimResource, listScimResources, upsertScimResource } from "@/lib/auth/scim/service"

const groupSchema = z.object({
  organizationId: z.number().int().positive(),
  externalId: z.string().min(1),
  displayName: z.string().min(1),
  members: z.array(z.object({ value: z.string(), display: z.string().optional() })).optional(),
})

export async function GET(request: NextRequest) {
  const organizationId = Number.parseInt(request.nextUrl.searchParams.get("organizationId") ?? "")
  if (!Number.isFinite(organizationId)) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 })
  }

  const data = await listScimResources(organizationId, "Group")
  return NextResponse.json({ Resources: data })
}

export async function POST(request: NextRequest) {
  try {
    const payload = groupSchema.parse(await request.json())
    const resource = await upsertScimResource(payload.organizationId, "Group", payload.externalId, payload)
    return NextResponse.json(resource, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid SCIM group payload", issues: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to provision group" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as { organizationId?: number; externalId?: string; active?: boolean }
  if (!body.organizationId || !body.externalId) {
    return NextResponse.json({ error: "organizationId and externalId are required" }, { status: 400 })
  }

  if (body.active === false) {
    const resource = await deactivateScimResource(body.organizationId, "Group", body.externalId)
    if (!resource) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    return NextResponse.json(resource)
  }

  return NextResponse.json({ error: "Unsupported patch operation" }, { status: 400 })
}
