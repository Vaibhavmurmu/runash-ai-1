import { NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { requireScopedBillingAccess } from "@/lib/billing-auth"

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response

  try {
    const { id } = await context.params
    const plans = await Database.query(`SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true LIMIT 1`, [id])

    if (!plans[0]) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    return NextResponse.json({ plan: plans[0] })
  } catch (error) {
    console.error("Get plan error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
