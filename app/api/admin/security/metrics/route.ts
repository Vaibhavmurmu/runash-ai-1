import { type NextRequest, NextResponse } from "next/server"
import { SecurityMonitor } from "@/lib/security-monitor"
import { z } from "zod"
import { requireAdminAuthorization } from "@/lib/auth-middleware"

const metricsSchema = z.object({
  start: z
    .string()
    .optional()
    .default(() => {
      const date = new Date()
      date.setDate(date.getDate() - 7)
      return date.toISOString().split("T")[0]
    }),
  end: z
    .string()
    .optional()
    .default(() => {
      return new Date().toISOString().split("T")[0]
    }),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.security.metrics.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const { start, end } = metricsSchema.parse(params)

    const metrics = await SecurityMonitor.getSecurityMetrics({ start, end })

    return NextResponse.json(metrics)
  } catch (error) {
    console.error("Error fetching security metrics:", error)
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 })
  }
}
