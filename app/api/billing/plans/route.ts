import { NextResponse } from "next/server"
import { Database } from "@/lib/database"

export async function GET() {
  try {
    const plans = await Database.query(
      `SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price ASC, created_at ASC`,
    )

    return NextResponse.json({ plans })
  } catch (error) {
    console.error("Get plans error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
