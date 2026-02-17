import { type NextRequest, NextResponse } from "next/server"
import { AuthLogger, type LogFilters } from "@/lib/auth-logger"
import { z } from "zod"
import { requireAdminAuthorization } from "@/lib/auth-middleware"

const logsSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val) : 50)),
  user_id: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val) : undefined)),
  event_type: z.string().optional(),
  event_category: z.string().optional(),
  success: z
    .string()
    .optional()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
  ip_address: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  risk_score_min: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val) : undefined)),
  risk_score_max: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val) : undefined)),
  search: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["system:logs"],
    auditEvent: "admin.logs.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const validatedParams = logsSchema.parse(params)

    const { page, limit, ...filters } = validatedParams
    const result = await AuthLogger.getLogs(filters as LogFilters, page, limit)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching logs:", error)
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}
