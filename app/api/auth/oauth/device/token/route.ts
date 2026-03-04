import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { exchangeDeviceToken } from "@/lib/auth/plugins/oauth-device-grant"

const tokenSchema = z.object({
  grant_type: z.literal("urn:ietf:params:oauth:grant-type:device_code"),
  device_code: z.string().min(1),
  client_id: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const payload = tokenSchema.parse(await request.json())
    const token = await exchangeDeviceToken(payload.device_code)

    if ("error" in token) {
      return NextResponse.json(token, { status: token.status })
    }

    return NextResponse.json(token)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request", issues: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
