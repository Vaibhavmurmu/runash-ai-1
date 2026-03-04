import { type NextRequest } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { handleSwitchSessionScope } from "./switch-session-route-handler"

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession(request.headers)
  return handleSwitchSessionScope(request, session?.user ? { id: session.user.id } : null)
}
