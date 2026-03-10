import { NextResponse } from "next/server"

import { revokeApiKey, rotateApiKey } from "@/lib/api-platform/api-key-store"

function logApiKeyAudit(event: string, details: Record<string, unknown>) {
  console.info("[api_keys.audit]", {
    event,
    at: new Date().toISOString(),
    ...details,
  })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as { action?: string }

  if (body.action === "rotate") {
    const rotated = await rotateApiKey(id)
    if (!rotated) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }

    logApiKeyAudit("api_key.rotated", {
      keyId: rotated.key.id,
      status: rotated.key.status,
    })

    return NextResponse.json(rotated)
  }

  if (body.action === "revoke") {
    const revoked = await revokeApiKey(id)
    if (!revoked) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }

    logApiKeyAudit("api_key.revoked", {
      keyId: revoked.id,
      status: revoked.status,
    })

    return NextResponse.json({ key: revoked })
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
}
