import { type NextRequest, NextResponse } from "next/server"
import { getUsageSummary, incrementUsage, type UsageMetric } from "@/lib/billing-usage"
import { requireBillingSession, requireScopedRole } from "@/lib/billing-auth"

export async function GET(req: NextRequest) {
  const auth = await requireBillingSession()
  if (auth.unauthorizedResponse || !auth.sessionUser) {
    return auth.unauthorizedResponse
  }

  const roleResponse = requireScopedRole(auth.sessionUser, "startup")
  if (roleResponse) return roleResponse

  const plan = (req.nextUrl.searchParams.get("plan") || "free") as any
  const period = req.nextUrl.searchParams.get("period") || undefined
  const summary = await getUsageSummary(auth.sessionUser.userId, plan, period)
  return NextResponse.json(summary)
}

export async function POST(req: NextRequest) {
  const auth = await requireBillingSession()
  if (auth.unauthorizedResponse || !auth.sessionUser) {
    return auth.unauthorizedResponse
  }

  const roleResponse = requireScopedRole(auth.sessionUser, "startup")
  if (roleResponse) return roleResponse

  const body = await req.json().catch(() => null)
  if (!body || typeof body.metric !== "string" || typeof body.amount !== "number") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  await incrementUsage({
    userId: auth.sessionUser.userId,
    metric: body.metric as UsageMetric,
    amount: body.amount,
    period: body.period as string | undefined,
  })

  return NextResponse.json({ ok: true })
}

export const dynamic = "force-dynamic"
