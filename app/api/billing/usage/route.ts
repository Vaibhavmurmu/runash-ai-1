import { type NextRequest, NextResponse } from "next/server"
import { getUsageSummary, incrementUsage, type UsageMetric } from "@/lib/billing-usage"
import { requireScopedBillingAccess } from "@/lib/billing-auth"

export async function GET(req: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  const plan = (req.nextUrl.searchParams.get("plan") || "free") as any
  const period = req.nextUrl.searchParams.get("period") || undefined
  const summary = await getUsageSummary(sessionUser.userId, plan, period)
  return NextResponse.json(summary)
}

export async function POST(req: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  const body = await req.json().catch(() => null)
  if (!body || typeof body.metric !== "string" || typeof body.amount !== "number") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  await incrementUsage({
    userId: sessionUser.userId,
    metric: body.metric as UsageMetric,
    amount: body.amount,
    period: body.period as string | undefined,
  })

  return NextResponse.json({ ok: true })
}

export const dynamic = "force-dynamic"
