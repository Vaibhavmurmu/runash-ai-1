import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { logApiEvent } from "@/lib/api/logging"
import { getAuthEndpointRateLimit } from "@/lib/auth-security-config"
import { recordAuthMetric } from "@/lib/auth-observability"

type SessionRole = "admin" | "super_admin" | "seller" | "user" | string

type AuthClaims = {
  isAuthenticated: boolean
  role: SessionRole | null
}

type AccessRequirement = {
  requiresSession: boolean
  requiredRoles: SessionRole[]
}

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
  "/pro",
  "/enterprise",
  "/ai-overview",
  "/models",
  "/company",
  "/waitlist",
] as const

const publicApiRouteMatchers = [
  { pattern: /^\/api\/auth\/(signin|signout|callback|csrf|providers|error|verify-request)(?:\/|$)/ },
  { path: "/api/auth/get-session", type: "exact" },
  { path: "/api/auth/session", type: "exact" },
  { path: "/api/auth/refresh", type: "exact" },
  { path: "/api/auth/siwe/nonce", type: "exact" },
  { path: "/api/auth/siwe/verify", type: "exact" },
  { path: "/api/auth/magic-link", type: "prefix" },
  { path: "/api/auth/phone-otp", type: "exact" },
  { path: "/api/auth/ott/issue", type: "exact" },
  { path: "/api/auth/ott/verify", type: "exact" },
  { path: "/api/auth/google-one-tap/callback", type: "exact" },
  { path: "/api/auth/anonymous", type: "exact" },
  { path: "/api/auth/resend-verification", type: "exact" },
  { path: "/api/auth/sso/check", type: "exact" },
  { path: "/api/turn-credentials", type: "exact" },
  { path: "/api/users/search", type: "exact" }, // Public user search
] as const

const adminOnlyRoutePrefixes = ["/admin", "/ecommerce/admin", "/api/admin"] as const
const sellerOnlyRoutePrefixes = ["/seller", "/seller-dashboard", "/api/seller", "/api/v1/seller"] as const
const authenticatedRoutePrefixes = ["/dashboard", "/settings", "/api/settings", "/api/billing", "/api/upload"] as const

function pathMatchesPrefixes(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))
}

export function resolveRouteAccessRequirement(pathname: string): AccessRequirement {
  if (pathMatchesPrefixes(pathname, adminOnlyRoutePrefixes)) {
    return { requiresSession: true, requiredRoles: ["admin", "super_admin"] }
  }

  if (pathMatchesPrefixes(pathname, sellerOnlyRoutePrefixes)) {
    return { requiresSession: true, requiredRoles: ["seller", "admin", "super_admin"] }
  }

  if (pathMatchesPrefixes(pathname, authenticatedRoutePrefixes)) {
    return { requiresSession: true, requiredRoles: [] }
  }

  return { requiresSession: false, requiredRoles: [] }
}

export function evaluateRoleAccess(pathname: string, claims: AuthClaims): { status: "allowed" | "unauthorized" | "forbidden" } {
  const requirement = resolveRouteAccessRequirement(pathname)
  if (!requirement.requiresSession) {
    return { status: "allowed" }
  }

  if (!claims.isAuthenticated) {
    return { status: "unauthorized" }
  }

  if (requirement.requiredRoles.length > 0) {
    if (!claims.role || !requirement.requiredRoles.includes(claims.role)) {
      return { status: "forbidden" }
    }
  }

  return { status: "allowed" }
}

export function resolveAuthDecision(pathname: string) {
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))
  const isPublicApiRoute = publicApiRouteMatchers.some((matcher) => {
    if ("pattern" in matcher) {
      return matcher.pattern.test(pathname)
    }

    if (matcher.type === "exact") {
      return pathname === matcher.path
    }

    return pathname === matcher.path || pathname.startsWith(matcher.path + "/")
  })
  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/get-started"

  return {
    isAuthPage,
    requiresSessionValidation: !isPublicApiRoute && (!isPublicRoute || isAuthPage),
  }
}

async function hasValidAuthSession(request: NextRequest): Promise<boolean> {
  try {
    const sessionPayload = await auth.api.getSession({
      headers: request.headers,
    })
    return Boolean(sessionPayload?.user && sessionPayload?.session)
  } catch {
    return false
  }
}

async function getAuthClaimsFromSession(request: NextRequest): Promise<AuthClaims> {
  try {
    const sessionClaimsResponse = await fetch(new URL("/api/auth/claims", request.url), {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        authorization: request.headers.get("authorization") ?? "",
      },
      cache: "no-store",
    })

    if (!sessionClaimsResponse.ok) {
      return { isAuthenticated: false, role: null }
    }

    const sessionClaims = await sessionClaimsResponse.json()
    return {
      isAuthenticated: Boolean(sessionClaims?.authenticated),
      role: typeof sessionClaims?.role === "string" ? sessionClaims.role : null,
    }
  } catch {
    return { isAuthenticated: false, role: null }
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
  const screenshotPreviewBypass =
    process.env.NODE_ENV !== "production" &&
    pathname === "/dashboard/chat" &&
    request.nextUrl.searchParams.get("previewChatScreenshots") === "1"
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

  if (!requiresSessionValidation || screenshotPreviewBypass) {
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

  const authClaims = await getAuthClaimsFromSession(request)
  const accessDecision = evaluateRoleAccess(pathname, authClaims)

  if (accessDecision.status === "unauthorized") {
    if (pathname.startsWith("/api/")) {
      return new NextResponse(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (accessDecision.status === "forbidden") {
    if (pathname.startsWith("/api/")) {
      return new NextResponse(JSON.stringify({ message: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }
    return NextResponse.redirect(new URL("/dashboard?error=forbidden", request.url))
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
