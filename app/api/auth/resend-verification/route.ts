import { type NextRequest } from "next/server"
import { handleResendVerification } from "./resend-verification-route-handler"

export async function POST(request: NextRequest): Promise<Response> {
  return handleResendVerification(request)
}
