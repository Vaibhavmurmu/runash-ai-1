import { type NextRequest, NextResponse } from "next/server"
import { SecurityMonitor } from "@/lib/security-monitor"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth/session"

const threatsSchema = z.object({
  status: z.enum(["active", "investigating", "resolved", "false_positive"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val) : 50)),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const { limit } = threatsSchema.parse(params)

    const threats = await SecurityMonitor.getActiveThreats(limit)

    return NextResponse.json(threats)
  } catch (error) {
    console.error("Error fetching threats:", error)
    return NextResponse.json({ error: "Failed to fetch threats" }, { status: 500 })
  }
}

const createThreatSchema = z.object({
  threat_type: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  title: z.string(),
  description: z.string(),
  source_ip: z.string(),
  target_user_id: z.number().optional(),
  indicators: z.array(z.string()).default([]),
  risk_score: z.number().min(0).max(10).default(5),
  metadata: z.record(z.any()).default({}),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createThreatSchema.parse(body)

    const threatId = await SecurityMonitor.createThreat(
      validatedData.threat_type,
      validatedData.severity,
      validatedData.title,
      validatedData.description,
      validatedData.source_ip,
      validatedData.target_user_id,
      validatedData.indicators,
      validatedData.risk_score,
      validatedData.metadata,
    )

    return NextResponse.json({ id: threatId, message: "Threat created successfully" })
  } catch (error) {
    console.error("Error creating threat:", error)
    return NextResponse.json({ error: "Failed to create threat" }, { status: 500 })
  }
}
