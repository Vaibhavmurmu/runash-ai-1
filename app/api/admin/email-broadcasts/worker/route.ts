import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { processDueBroadcastJobs } from "@/lib/email-broadcast-worker"

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.email.broadcasts.worker.run",
  })
  if (!auth.success) return auth.response

  try {
    const result = await processDueBroadcastJobs({ jobLimit: 5, batchSize: 200 })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("Error processing broadcast queue:", error)
    return NextResponse.json({ error: "Failed to process broadcast queue" }, { status: 500 })
  }
}
