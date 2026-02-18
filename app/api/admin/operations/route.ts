import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { PerformanceOptimizer } from "@/lib/performance"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { recordAuthMetric } from "@/lib/auth-observability"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"
import { recordSecurityAuditEvent } from "@/lib/security-audit-events"

const operationSchema = z.object({
  action: z.enum(["cache.clear", "jobs.cleanup", "service.restart_hook"]),
  restartUrl: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["system:maintenance"],
    auditEvent: "admin.operations.execute",
  })
  if (!auth.success) return auth.response

  try {
    const parsed = operationSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    switch (parsed.data.action) {
      case "cache.clear":
        await PerformanceOptimizer.invalidatePattern("*")
        break
      case "jobs.cleanup":
        await PerformanceOptimizer.processBackgroundJobs()
        break
      case "service.restart_hook": {
        const restartHookUrl = parsed.data.restartUrl ?? process.env.OPERATIONS_RESTART_HOOK_URL
        if (!restartHookUrl) {
          return NextResponse.json({ error: "Restart hook URL is not configured" }, { status: 400 })
        }

        const restartResponse = await fetch(restartHookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ source: "admin.operations" }),
        })

        if (!restartResponse.ok) {
          return NextResponse.json({ error: "Restart hook call failed" }, { status: 502 })
        }

        break
      }
    }

    recordAuthMetric("admin.operation.executed", { adminId: auth.userId, action: parsed.data.action })
    await recordSecurityAuditEvent({
      event: "admin.action.executed",
      actorUserId: auth.userId,
      resource: "admin_operations",
      request,
      details: {
        kind: "admin_action",
        outcome: "success",
        action: parsed.data.action,
      },
    })

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "operator.action.executed",
      entityType: "operations",
      metadata: { action: parsed.data.action },
    })

    return NextResponse.json({ success: true, action: parsed.data.action })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.operations.execute.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_OPERATIONS_EXECUTE_FAILED",
    })
  }
}
