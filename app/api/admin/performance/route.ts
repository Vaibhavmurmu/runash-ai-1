import { type NextRequest, NextResponse } from "next/server"
import { PerformanceOptimizer } from "@/lib/performance"
import { requireAdminAuthorization } from "@/lib/auth-middleware"

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
    console.error("Performance metrics error:", error)
    return NextResponse.json({ error: "Failed to fetch performance metrics" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["system:maintenance"],
    auditEvent: "admin.performance.execute",
  })
  if (!auth.success) return auth.response

  try {
    const { action } = await request.json()

    switch (action) {
      case "clear_cache":
        await PerformanceOptimizer.invalidatePattern("*")
        break
      case "run_cleanup":
        await PerformanceOptimizer.processBackgroundJobs()
        break
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Performance action error:", error)
    return NextResponse.json({ error: "Failed to execute performance action" }, { status: 500 })
  }
}
