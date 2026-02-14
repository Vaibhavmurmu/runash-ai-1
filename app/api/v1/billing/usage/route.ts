import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { getUsageSummary, incrementUsage, type UsageMetric } from "@/lib/billing-usage"

export async function GET(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  const plan = (request.nextUrl.searchParams.get("plan") || "free") as any
  const period = request.nextUrl.searchParams.get("period") || undefined
  const summary = await getUsageSummary(sessionUser.userId, plan, period)
  return respondSuccess(request, summary)
}

export async function POST(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  const body = await request.json().catch(() => null)
  if (!body || typeof body.metric !== "string" || typeof body.amount !== "number") {
    return respondError(request, { code: "INVALID_REQUEST", message: "Invalid body" }, { status: 400 })
  }

  await incrementUsage({
    userId: sessionUser.userId,
    metric: body.metric as UsageMetric,
    amount: body.amount,
    period: body.period as string | undefined,
  })

  return respondSuccess(request, { ok: true })
}

export const dynamic = "force-dynamic"
