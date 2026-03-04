import { type NextRequest } from "next/server"
import { handleWaitlistPost } from "./waitlist-route-handler"

export async function POST(request: NextRequest) {
  return handleWaitlistPost(request)
}
