import { NextResponse } from "next/server"
import { processDueScheduledJobs } from "@/lib/scheduler"

export async function POST() {
  const workerId = `managed-scheduler-${process.pid}`
  const result = await processDueScheduledJobs({ workerId, limit: 25 })
  return NextResponse.json(result)
}

export const dynamic = "force-dynamic"
