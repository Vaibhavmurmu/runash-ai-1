import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { logApiEvent } from "@/lib/api/logging"
import { getAuthEndpointRateLimit } from "@/lib/auth-security-config"
import { recordAuthMetric } from "@/lib/auth-observability"

const BETTER_AUTH_COOKIE_NAMES = ["better-auth.session-token", "__Secure-better-auth.session-token"] as const

const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/get-started",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/about",
  "/features",
  "/pricing",
  "/contact",
  "/blog",
  "/careers",
  "/press",
  "/support",
  "/tutorials",
  "/integrations",
  "/privacy",
  "/terms",
  "/cookies",
  "/roadmap",
  "/status",
  "/creator",
  "/business",
  "/partners",
  "/changelog",
  "/forum",
  "/community",
  "/pro",
  "/enterprise",
  "/ai-overview",
  "/models",
  "/company",
  "/faq",
  "/docs",
  "/live",
] as const

const publicApiRoutes = [
  "/api/auth",
  "/api/turn-credentials",
  "/api/users/search", // Public user search
] as const

function parseCookieValue(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader) {
    return null
  }

  for (const segment of cookieHeader.split(";")) {
    const [name, ...valueParts] = segment.trim().split("=")
    if (name !== cookieName) {
      continue
    }

    const cookieValue = valueParts.join("=")
    return cookieValue || null
  }

  return null
}

function hasBetterAuthSessionCookie(request: NextRequest): boolean {
  const cookieHeader = request.headers.get("cookie")
  return BETTER_AUTH_COOKIE_NAMES.some((cookieName) => Boolean(parseCookieValue(cookieHeader, cookieName)))
}

function resolveAuthDecision(pathname: string) {
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))
  const isPublicApiRoute = publicApiRoutes.some((route) => pathname.startsWith(route))
  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/get-started"

  return {
    isAuthPage,
    requiresSessionValidation: !isPublicApiRoute && (!isPublicRoute || isAuthPage),
  }
}

async function hasValidAuthSession(request: NextRequest): Promise<boolean> {
  if (!hasBetterAuthSessionCookie(request)) {
    return false
  }

  try {
    const sessionResponse = await fetch(new URL("/api/auth/get-session", request.url), {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    })

    if (!sessionResponse.ok) {
      return false
    }

    const sessionPayload = await sessionResponse.json()
    return Boolean(sessionPayload?.user && sessionPayload?.session)
  } catch {
    return false
  }
}

// Security headers
const securityHeaders = {
  "X-DNS-Prefetch-Control": "on",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-XSS-Protection": "1; mode=block",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}

// Rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function getRateLimitKey(request: NextRequest, identifier: string): string {
  const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"
  return `${identifier}:${ip}`
}

function checkRateLimit(request: NextRequest, identifier: string, limit: number, windowMs: number): boolean {
  const key = getRateLimitKey(request, identifier)
  const now = Date.now()

  // Clean up old entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetTime < now) {
      rateLimitStore.delete(k)
    }
  }

  const current = rateLimitStore.get(key)

  if (!current || current.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    })
    return true
  }

  if (current.count >= limit) {
    return false
  }

  current.count++
  rateLimitStore.set(key, current)
  return true
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { isAuthPage, requiresSessionValidation } = resolveAuthDecision(pathname)
  const response = NextResponse.next()

  // Add security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Add CSP header
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https:;
    font-src 'self' https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim()

  response.headers.set("Content-Security-Policy", cspHeader)

  // Rate limiting for sensitive endpoints
  if (pathname.startsWith("/api/auth/")) {
    const authEndpoint = pathname.replace(/^\/api\/auth\//, "")
    const { limit, windowMs } = getAuthEndpointRateLimit(pathname)

    if (!checkRateLimit(request, `auth-${authEndpoint}`, limit, windowMs)) {
      recordAuthMetric("auth.rate_limited", { endpoint: authEndpoint })
      return new NextResponse(JSON.stringify({ message: "Too many requests. Please try again later." }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.max(1, Math.ceil(windowMs / 1000))),
        },
      })
    }
  }

  if (pathname.startsWith("/api/admin")) {
    if (!checkRateLimit(request, "admin-sensitive", 40, 5 * 60 * 1000)) {
      recordAuthMetric("auth.rate_limited", { endpoint: "admin-sensitive" })
      return new NextResponse(JSON.stringify({ message: "Admin API rate limit exceeded" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "300",
        },
      })
    }
  }

  if (pathname === "/api/settings/actions/regenerate-api-key" || pathname === "/api/settings/actions/revoke-sessions") {
    if (!checkRateLimit(request, "settings-sensitive", 10, 15 * 60 * 1000)) {
      recordAuthMetric("auth.rate_limited", { endpoint: "settings-sensitive" })
      return new NextResponse(JSON.stringify({ message: "Sensitive action rate limit exceeded" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "900",
        },
      })
    }
  }

  // General API rate limiting
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
    if (!checkRateLimit(request, "api-general", 100, 60 * 1000)) {
      // 100 requests per minute
      return new NextResponse(JSON.stringify({ message: "API rate limit exceeded" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      })
    }
  }

  if (!requiresSessionValidation) {
    return response
  }

  const isAuthenticated = await hasValidAuthSession(request)

  // Redirect authenticated users away from auth pages
  if (isAuthPage) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return response
  }

  // Check authentication for protected routes
  if (!isAuthenticated) {
    recordAuthMetric("auth.login.failed", { endpoint: pathname, reason: "missing_or_invalid_session" })
    if (pathname.startsWith("/api/")) {
      return new NextResponse(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Log security events for audit
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    recordAuthMetric("auth.login.success", { endpoint: pathname.startsWith("/api/") ? "admin_api" : "admin_ui" })
    logApiEvent("info", "security.admin_access", {
      requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
      route: pathname,
      method: request.method,
      details: {
        actorRole: "unknown",
        accessScope: pathname.startsWith("/api/") ? "api" : "ui",
      },
    })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
