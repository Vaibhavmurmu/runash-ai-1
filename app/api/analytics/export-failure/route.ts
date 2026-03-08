import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"

const ALLOWED_FORMATS = new Set(["csv", "json", "pdf", "image"])
const ALLOWED_STAGES = new Set(["fetch", "download"])

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json().catch(() => null)) as
      | {
          event?: string
          format?: string
          stage?: string
          reason?: string
          period?: string
          hasCachedSnapshot?: boolean
          occurredAt?: string
        }
      | null

    if (!payload || payload.event !== "analytics_export_failure") {
      return respondError(req, { code: "INVALID_PAYLOAD", message: "Invalid telemetry payload." }, { status: 400 })
    }

    const format = typeof payload.format === "string" && ALLOWED_FORMATS.has(payload.format) ? payload.format : "unknown"
    const stage = typeof payload.stage === "string" && ALLOWED_STAGES.has(payload.stage) ? payload.stage : "unknown"
    const reason = typeof payload.reason === "string" ? payload.reason.slice(0, 160) : "unknown"
    const period = typeof payload.period === "string" ? payload.period.slice(0, 64) : "unknown"

    console.info("[analytics.export.telemetry]", {
      event: "analytics_export_failure",
      format,
      stage,
      reason,
      period,
      hasCachedSnapshot: Boolean(payload.hasCachedSnapshot),
      occurredAt: typeof payload.occurredAt === "string" ? payload.occurredAt : new Date().toISOString(),
    })

    return respondSuccess(req, { recorded: true })
  } catch {
    return respondError(req, { code: "INTERNAL_ERROR", message: "Unable to record export telemetry." }, { status: 500 })
  }
}
