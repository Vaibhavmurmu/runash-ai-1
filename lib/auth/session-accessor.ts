import { getAuthSessionFromHeaders as getSessionFromAuthModule, type BetterAuthSession } from "@/lib/auth"

export type { BetterAuthSession }

export async function getAuthSessionFromHeaders(requestHeaders: Headers): Promise<BetterAuthSession | null> {
  return getSessionFromAuthModule(requestHeaders)
}
