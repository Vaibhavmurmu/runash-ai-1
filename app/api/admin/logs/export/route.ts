import { type NextRequest, NextResponse } from "next/server"
import { AuthLogger, type LogFilters } from "@/lib/auth-logger"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth/session"

const exportSchema = z.object({
  format: z.enum(["csv", "json"]).default("csv"),
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
  search: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const validatedParams = exportSchema.parse(params)

    const { format, ...filters } = validatedParams
    const exportData = await AuthLogger.exportLogs(filters as LogFilters, format)

    const filename = `auth-logs-${new Date().toISOString().split("T")[0]}.${format}`
    const contentType = format === "csv" ? "text/csv" : "application/json"

    return new NextResponse(exportData, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error exporting logs:", error)
    return NextResponse.json({ error: "Failed to export logs" }, { status: 500 })
  }
}
