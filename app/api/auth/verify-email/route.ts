import { type NextRequest } from "next/server"
import { handleVerifyEmailGet, handleVerifyEmailPost } from "./verify-email-route-handler"

export async function GET(request: NextRequest) {
  return handleVerifyEmailGet(request)
}

export async function POST(request: NextRequest) {
  return handleVerifyEmailPost(request)
}
