import { NextResponse } from "next/server"
import { listMcpAudit } from "@/lib/mcp/connectors-store"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get("limit") ?? "100")
  return NextResponse.json({ audit: listMcpAudit(limit) })
}
