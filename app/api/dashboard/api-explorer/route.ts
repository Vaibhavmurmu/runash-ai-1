import { NextResponse } from "next/server"
import { z } from "zod"

const explorerSchema = z.object({
  method: z.enum(["GET", "POST", "PATCH", "DELETE"]),
  endpoint: z.string().trim().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = explorerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid explorer request",
        errorCode: "API_EXPLORER_INVALID_REQUEST",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    )
  }

  const requestId = `exp_${Date.now().toString(36)}`
  return NextResponse.json({
    requestId,
    status: 200,
    echoed: parsed.data,
    simulated: true,
    notes: "Explorer runs in safe simulation mode in dashboard preview.",
  })
}
