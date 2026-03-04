import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { deactivateScimResource, listScimResources, upsertScimResource } from "@/lib/auth/scim/service"

const createUserSchema = z.object({
  organizationId: z.number().int().positive(),
  externalId: z.string().min(1),
  userName: z.string().email(),
  displayName: z.string().optional(),
  active: z.boolean().optional(),
  name: z
    .object({
      givenName: z.string().optional(),
      familyName: z.string().optional(),
    })
    .optional(),
  emails: z.array(z.object({ value: z.string().email(), primary: z.boolean().optional() })).optional(),
})

export async function GET(request: NextRequest) {
  const organizationId = Number.parseInt(request.nextUrl.searchParams.get("organizationId") ?? "")
  if (!Number.isFinite(organizationId)) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 })
  }

  const data = await listScimResources(organizationId, "User")
  return NextResponse.json({ Resources: data })
}

export async function POST(request: NextRequest) {
  try {
    const payload = createUserSchema.parse(await request.json())
    const resource = await upsertScimResource(payload.organizationId, "User", payload.externalId, payload)
    return NextResponse.json(resource, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid SCIM user payload", issues: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to provision user" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as { organizationId?: number; externalId?: string; active?: boolean }
  if (!body.organizationId || !body.externalId) {
    return NextResponse.json({ error: "organizationId and externalId are required" }, { status: 400 })
  }

  if (body.active === false) {
    const resource = await deactivateScimResource(body.organizationId, "User", body.externalId)
    if (!resource) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(resource)
  }

  return NextResponse.json({ error: "Unsupported patch operation" }, { status: 400 })
}
