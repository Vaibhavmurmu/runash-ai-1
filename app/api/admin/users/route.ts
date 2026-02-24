import { type NextRequest, NextResponse } from "next/server"
import { UserManager } from "@/lib/user-management"
import { z } from "zod"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ASSIGNABLE_ADMIN_ROLES, normalizeRoleForStorage } from "@/lib/rbac"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"

const getUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
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
    const result = await UserManager.getUsers(filters, { page, limit }, { sessionOrganizationId: auth.session.user.ssoOrganization })

    return NextResponse.json(result)
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.users.list.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_USERS_LIST_FAILED",
    })
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

    const storedRole = normalizeRoleForStorage(validatedBody.role)
    const createdUser = await UserManager.createUser(
      {
        name: validatedBody.name,
        username: validatedBody.username,
        email: validatedBody.email,
        role: storedRole,
        organizationId: auth.session.user.ssoOrganization ?? null,
      },
      auth.userId,
    )

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "user.created",
      entityType: "user",
      entityId: createdUser.id,
      metadata: { requestedRole: validatedBody.role, storedRole },
    })

    return NextResponse.json({
      message: "User created successfully",
      user: createdUser,
      requestedRole: validatedBody.role,
      storedRole,
    })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.users.create.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_USER_CREATE_FAILED",
    })
  }
}
