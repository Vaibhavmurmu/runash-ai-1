import { NextResponse } from "next/server"
import { requireDashboardTenantContext } from "@/app/api/dashboard/_auth"
import { listMcpAudit } from "@/lib/mcp/connectors-store"

export async function GET(request: Request) {
  const context = await requireDashboardTenantContext(request)
  if (context instanceof Response) return context

  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get("limit") ?? "100")

  try {
    const audit = await listMcpAudit(limit, { tenantId: context.tenantId })
    return NextResponse.json({ audit })
  } catch {
    return NextResponse.json({ error: "Failed to list audit records" }, { status: 500 })
  }
}
