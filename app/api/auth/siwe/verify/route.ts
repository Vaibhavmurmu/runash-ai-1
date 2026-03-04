import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifySiweLogin } from "@/lib/auth/plugins/siwe"
import { getServerAuthSession } from "@/lib/auth/session"

const verifySchema = z.object({
  nonce: z.string().min(1),
  message: z.string().min(1),
  signature: z.string().min(1),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().int().positive().optional(),
})

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession(request.headers)
  const userId = Number.parseInt(session?.user?.id ?? "")

  try {
    const payload = verifySchema.parse(await request.json())
    const result = await verifySiweLogin({
      ...payload,
      userId: Number.isFinite(userId) ? userId : undefined,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 401 })
    }

    return NextResponse.json(result.walletSession)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request", issues: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
