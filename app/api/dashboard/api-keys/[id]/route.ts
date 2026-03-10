import { NextResponse } from "next/server"

import { revokeApiKey, rotateApiKey } from "@/lib/api-platform/api-key-store"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as { action?: string }

  if (body.action === "rotate") {
    try {
      const rotated = await rotateApiKey(id)
      if (!rotated) {
        return NextResponse.json({ error: "API key not found" }, { status: 404 })
      }

      return NextResponse.json(rotated)
    } catch {
      return NextResponse.json({ error: "Failed to rotate API key" }, { status: 500 })
    }
  }

  if (body.action === "revoke") {
    const revoked = await revokeApiKey(id)
    if (!revoked) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }

    return NextResponse.json({ key: revoked })
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
}
