import { type NextRequest, NextResponse } from "next/server"
import { RBACManager } from "@/lib/rbac"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { recordAuthMetric } from "@/lib/auth-observability"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"
import { z } from "zod"
import { queryOne } from "@/lib/db"
import { recordSecurityAuditEvent } from "@/lib/security-audit-events"

const userIdSchema = z.coerce.number().int().positive()
const permissionMutationSchema = z.object({ permission: z.string().min(2).max(100) })

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:read"],
    auditEvent: "admin.users.permissions.read",
  })
  if (!auth.success) return auth.response

  try {
    const userId = userIdSchema.parse(params.userId)
    const permissions = await RBACManager.getUserPermissions(userId)

    return NextResponse.json({ permissions })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.users.permissions.read.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_USER_PERMISSIONS_READ_FAILED",
    })
  }
}

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:write"],
    auditEvent: "admin.users.permissions.write",
  })
  if (!auth.success) return auth.response

  try {
    const { permission } = permissionMutationSchema.parse(await request.json())
    const userId = userIdSchema.parse(params.userId)
    const adminId = auth.userId

    if (userId === adminId) {
      return NextResponse.json({ message: "Cannot modify your own permission overrides" }, { status: 400 })
    }

    const [targetUser, knownPermission] = await Promise.all([
      queryOne<{ id: number }>(`SELECT id FROM users WHERE id = $1`, [userId]),
      queryOne<{ id: number }>(`SELECT id FROM admin_permissions WHERE key = $1`, [permission]),
    ])

    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (!knownPermission) {
      return NextResponse.json({ message: "Unknown permission" }, { status: 400 })
    }

    await RBACManager.grantPermission(userId, permission, adminId)
    recordAuthMetric("admin.permission.granted", { adminId, targetUserId: userId, permission })
    await recordSecurityAuditEvent({
      event: "admin.permission.granted",
      actorUserId: adminId,
      resource: "admin_user_permission",
      request,
      details: {
        kind: "admin_permission_change",
        outcome: "success",
        action: "grant",
        targetUserId: userId,
        permission,
      },
    })

    await recordAdminAuditLog({
      actorUserId: adminId,
      action: "user.permission.granted",
      entityType: "user",
      entityId: userId,
      metadata: { permission },
    })

    return NextResponse.json({ message: "Permission granted successfully" })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.users.permissions.grant.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_PERMISSION_GRANT_FAILED",
    })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["users:write", "system:control"],
    auditEvent: "admin.users.permissions.revoke",
  })
  if (!auth.success) return auth.response

  try {
    const { permission } = permissionMutationSchema.parse(await request.json())
    const userId = userIdSchema.parse(params.userId)
    const adminId = auth.userId

    if (userId === adminId) {
      return NextResponse.json({ message: "Cannot modify your own permission overrides" }, { status: 400 })
    }

    const [targetUser, knownPermission] = await Promise.all([
      queryOne<{ id: number }>(`SELECT id FROM users WHERE id = $1`, [userId]),
      queryOne<{ id: number }>(`SELECT id FROM admin_permissions WHERE key = $1`, [permission]),
    ])

    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (!knownPermission) {
      return NextResponse.json({ message: "Unknown permission" }, { status: 400 })
    }

    await RBACManager.revokePermission(userId, permission, adminId)
    recordAuthMetric("admin.permission.revoked", { adminId, targetUserId: userId, permission })
    await recordSecurityAuditEvent({
      event: "admin.permission.revoked",
      actorUserId: adminId,
      resource: "admin_user_permission",
      request,
      details: {
        kind: "admin_permission_change",
        outcome: "success",
        action: "revoke",
        targetUserId: userId,
        permission,
      },
    })

    await recordAdminAuditLog({
      actorUserId: adminId,
      action: "user.permission.revoked",
      entityType: "user",
      entityId: userId,
      metadata: { permission },
    })

    return NextResponse.json({ message: "Permission revoked successfully" })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.users.permissions.revoke.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_PERMISSION_REVOKE_FAILED",
    })
  }
}
