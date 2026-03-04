import { NextResponse } from "next/server"
import { discoverConnectorTools } from "@/lib/mcp/runtime"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const tools = await discoverConnectorTools(id)
    return NextResponse.json({ tools })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to discover connector tools" },
      { status: 404 },
    )
  }
}
