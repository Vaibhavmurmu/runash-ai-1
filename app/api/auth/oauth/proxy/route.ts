import { type NextRequest, NextResponse } from "next/server"
import { buildOAuthProxyRedirect } from "@/lib/auth/plugins/oauth-proxy"
import { recordAuthMetric } from "@/lib/auth-observability"

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("target")

  if (!target) {
    return NextResponse.json({ error: "Missing target redirect URL" }, { status: 400 })
  }

  const redirect = buildOAuthProxyRedirect(target, request.nextUrl.searchParams, request.nextUrl.hostname)
  if (!redirect) {
    recordAuthMetric("auth.oauth_proxy.denied")
    return NextResponse.json({ error: "Target host is not allowed" }, { status: 403 })
  }

  recordAuthMetric("auth.oauth_proxy.redirected")
  return NextResponse.redirect(redirect)
}
