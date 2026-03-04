import { NextResponse } from "next/server"
import { checkConnectorHealth } from "@/lib/mcp/runtime"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const health = await checkConnectorHealth(id)
    return NextResponse.json({ health })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Health check failed" }, { status: 404 })
  }
}
