import { createHash } from "node:crypto"
import { respondSuccess } from "@/lib/api/envelope"
import { requireStreamDashboardUserId } from "../utils"
import type { IntegrationKeyResponse } from "@/lib/types/dashboard-streams"

export async function POST(request: Request) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof Response) return scopedUserId

  const seed = `${scopedUserId}:${new Date().toISOString()}`
  const payload: IntegrationKeyResponse = {
    rtmpKey: `rk_${createHash("sha256").update(seed).digest("hex").slice(0, 32)}`,
  }

  return respondSuccess(request, payload, { legacy: payload })
}
