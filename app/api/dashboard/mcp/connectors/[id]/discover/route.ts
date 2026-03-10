import { NextResponse } from "next/server"
import { requireDashboardTenantContext } from "@/app/api/dashboard/_auth"
import { discoverConnectorTools } from "@/lib/mcp/runtime"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireDashboardTenantContext(request)
  if (context instanceof Response) return context

  const { id } = await params

  try {
    const tools = await discoverConnectorTools(id, { tenantId: context.tenantId })
    return NextResponse.json({ tools })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to discover connector tools"
    const status = message === "Connector not found" ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
