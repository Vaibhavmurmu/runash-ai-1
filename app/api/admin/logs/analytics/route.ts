import { type NextRequest, NextResponse } from "next/server"
import { AuthLogger } from "@/lib/auth-logger"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth/session"

const analyticsSchema = z.object({
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
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const { start, end } = analyticsSchema.parse(params)

    const analytics = await AuthLogger.getLogAnalytics({ start, end })

    return NextResponse.json(analytics)
  } catch (error) {
    console.error("Error fetching log analytics:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
