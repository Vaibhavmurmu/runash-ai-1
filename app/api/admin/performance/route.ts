import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { PerformanceOptimizer } from "@/lib/performance"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["system:maintenance"],
    auditEvent: "admin.performance.read",
  })
  if (!auth.success) return auth.response

  try {
    const metrics = await PerformanceOptimizer.getPerformanceMetrics()

    return NextResponse.json({
      success: true,
      data: metrics,
    })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.performance.read.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_PERFORMANCE_READ_FAILED",
    })
  }
}

const operationSchema = z.object({
  action: z.enum(["clear_cache", "run_cleanup", "restart_hooks"]),
  restartUrl: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["system:maintenance"],
    auditEvent: "admin.performance.execute",
  })
  if (!auth.success) return auth.response

  try {
    const parsed = operationSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    switch (parsed.data.action) {
      case "clear_cache":
        await PerformanceOptimizer.invalidatePattern("*")
        break
      case "run_cleanup":
        await PerformanceOptimizer.processBackgroundJobs()
        break
      case "restart_hooks": {
        const target = parsed.data.restartUrl ?? process.env.OPERATIONS_RESTART_HOOK_URL
        if (!target) return NextResponse.json({ error: "Restart hook URL is not configured" }, { status: 400 })
        const response = await fetch(target, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ source: "admin.performance" }) })
        if (!response.ok) return NextResponse.json({ error: "Restart hook call failed" }, { status: 502 })
        break
      }
    }

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "operation.executed",
      entityType: "system_operation",
      metadata: { action: parsed.data.action },
    })

    return NextResponse.json({ success: true, action: parsed.data.action })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.performance.execute.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_PERFORMANCE_OPERATION_FAILED",
    })
  }
}
