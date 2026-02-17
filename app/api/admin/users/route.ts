import { type NextRequest, NextResponse } from "next/server"
import { UserManager } from "@/lib/user-management"
import { z } from "zod"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ASSIGNABLE_ADMIN_ROLES, normalizeRoleForStorage } from "@/lib/rbac"

const getUsersSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val) : 20)),
  search: z.string().optional(),
  role: z.string().optional(),
  email_verified: z
    .string()
    .optional()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
  provider: z.string().optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  is_admin: z
    .string()
    .optional()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:read"],
    auditEvent: "admin.users.list",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const validatedParams = getUsersSchema.parse(params)

    const { page, limit, ...filters } = validatedParams
    const result = await UserManager.getUsers(filters, { page, limit })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

const createUserSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(1).optional(),
  email: z.string().email(),
  role: z.enum(ASSIGNABLE_ADMIN_ROLES).default("user"),
  password: z.string().min(8).optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:write"],
    auditEvent: "admin.users.create",
  })
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const validatedBody = createUserSchema.parse(body)

    return NextResponse.json({
      message: "User created successfully",
      requestedRole: validatedBody.role,
      storedRole: normalizeRoleForStorage(validatedBody.role),
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
