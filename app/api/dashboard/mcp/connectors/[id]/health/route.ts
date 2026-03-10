import { NextResponse } from "next/server"
import { requireDashboardTenantContext } from "@/app/api/dashboard/_auth"
import { checkConnectorHealth } from "@/lib/mcp/runtime"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireDashboardTenantContext(request)
  if (context instanceof Response) return context

  const { id } = await params

  try {
    const health = await checkConnectorHealth(id, { tenantId: context.tenantId })
    return NextResponse.json({ health })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health check failed"
    const status = message === "Connector not found" ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
