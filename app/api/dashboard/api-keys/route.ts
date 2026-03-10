import { NextResponse } from "next/server"
import { z } from "zod"

import { createApiKey, listApiKeys } from "@/lib/api-platform/api-key-store"

const createSchema = z.object({
  name: z.string().trim().min(3),
  scopes: z.array(z.string().trim().min(1)).min(1),
})

export async function GET() {
  const keys = await listApiKeys()
  return NextResponse.json({ keys })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid API key payload", details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const created = await createApiKey(parsed.data)
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 })
  }
}
