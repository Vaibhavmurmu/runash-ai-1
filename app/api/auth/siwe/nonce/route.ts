import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { issueSiweNonce } from "@/lib/auth/plugins/siwe"

const nonceSchema = z.object({
  domain: z.string().min(1),
  chainId: z.number().int().positive().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const payload = nonceSchema.parse(await request.json())
    const nonce = await issueSiweNonce(payload.domain, payload.chainId)
    return NextResponse.json(nonce)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request", issues: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
