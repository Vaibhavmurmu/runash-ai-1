import { type NextRequest, NextResponse } from "next/server"
import { createSSOOrganization } from "@/lib/sso"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth/session"

const createOrgSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  domain: z.string().min(1, "Domain is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  ssoEnabled: z.boolean().optional(),
  autoProvision: z.boolean().optional(),
  defaultRole: z.enum(["user", "admin", "moderator"]).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, domain, slug, ssoEnabled, autoProvision, defaultRole } = createOrgSchema.parse(body)

    const organization = await createSSOOrganization(name, domain, slug, Number.parseInt(session.user.id), {
      ssoEnabled,
      autoProvision,
      defaultRole,
    })

    if (!organization) {
      return NextResponse.json({ error: "Failed to create organization" }, { status: 500 })
    }

    return NextResponse.json(organization)
  } catch (error) {
    console.error("Create SSO organization error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
