import { getServerAuthSession } from "@/lib/auth/session"
import { auditCommunityRegistrationAttempt } from "@/lib/community-registration-audit"
import { registerCommunityEvent } from "@/lib/services/community-registration-service"
import { handleCommunityRegisterPostRequest } from "./register-route-handler"

/**
 * POST /api/community/register
 * Accepts { eventId } in JSON body.
 */
export async function POST(request: Request) {
  return handleCommunityRegisterPostRequest(request, {
    getSession: () => getServerAuthSession(new Headers(request.headers)),
    register: registerCommunityEvent,
    audit: auditCommunityRegistrationAttempt,
  })
}
