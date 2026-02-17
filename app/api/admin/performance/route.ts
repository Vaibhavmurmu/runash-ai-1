import { type NextRequest, NextResponse } from "next/server"
import { PerformanceOptimizer } from "@/lib/performance"
import { requirePermission } from "@/lib/auth-middleware"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin permissions
    const hasPermission = await requirePermission(session.user.id, "admin.performance.view")
    if (!hasPermission) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

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
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await requirePermission(session.user.id, "admin.performance.manage")
    if (!hasPermission) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

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
