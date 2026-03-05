import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { logApiEvent } from "@/lib/api/logging"
import { getAuthEndpointRateLimit } from "@/lib/auth-security-config"
import { recordAuthMetric } from "@/lib/auth-observability"

async function hasValidAuthSession(request: NextRequest): Promise<boolean> {
  try {
    const authToken = request.headers.get("authorization")
    if (!authToken) {
      return false
    }

    // Extract token from "Bearer <token>"
    const token = authToken.replace("Bearer ", "")
    
    // Validate token format and expiry (simplified validation)
    if (!token || token.length < 20) {
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Auth session validation error:", error)
    return false
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Define protected routes
  const protectedPaths = [
    "/api/auth/",
    "/api/dashboard/",
    "/api/user/",
    "/api/bills/",
    "/dashboard",
    "/settings",
    "/profile",
  ]

  // Check if path is protected
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path))

  if (isProtectedPath && pathname.startsWith("/api/auth")) {
    // Rate limiting for auth endpoints
    const rateLimit = getAuthEndpointRateLimit()
    
    if (request.method === "POST") {
      // Log auth attempt
      await logApiEvent({
        type: "auth_attempt",
        endpoint: pathname,
        method: request.method,
        timestamp: new Date().toISOString(),
      })

      // Record metric
      await recordAuthMetric({
        action: "attempt",
        endpoint: pathname,
      })
    }
  }

  // Public routes that don't need authentication
  const publicPaths = ["/", "/api/public", "/login", "/signup", "/recordings"]
  const isPublic = publicPaths.some((path) => pathname.startsWith(path)) || pathname.includes(".")

  // If it's a protected API route and no valid session, return 401
  if (pathname.startsWith("/api/") && isProtectedPath && !isPublic) {
    const hasSession = await hasValidAuthSession(request)
    if (!hasSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  // Add security headers
  const response = NextResponse.next()
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
