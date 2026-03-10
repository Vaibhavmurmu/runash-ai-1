import { NextResponse } from "next/server"
import { requireDashboardSessionUserId } from "../_auth"

export function getCanonicalStreamUrl(id: string) {
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "")
  return `${base}/stream/${id}`
}

export async function requireStreamDashboardUserId(request: Request): Promise<string | NextResponse> {
  return requireDashboardSessionUserId(request)
}
