import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { startDeviceAuthorization } from "@/lib/auth/plugins/oauth-device-grant"

const requestSchema = z.object({
  client_id: z.string().min(1),
  scope: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const payload = requestSchema.parse(await request.json())
    const data = await startDeviceAuthorization(payload.client_id, payload.scope)
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request", issues: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
