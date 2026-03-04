import { NextResponse } from "next/server"
import { revokeApiKey, rotateApiKey } from "@/lib/api-platform/api-key-store"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => ({})) as { action?: string }

  if (body.action === "rotate") {
    const rotated = rotateApiKey(id)
    if (!rotated) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }
    return NextResponse.json(rotated)
  }

  if (body.action === "revoke") {
    const revoked = revokeApiKey(id)
    if (!revoked) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }
    return NextResponse.json({ key: revoked })
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
}
