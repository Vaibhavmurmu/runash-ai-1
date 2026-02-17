import type { NextRequest } from "next/server"
import { resolveRequestId } from "@/lib/api/response"

const SENSITIVE_KEY_PATTERN =
  /(password|secret|token|authorization|cookie|api[-_]?key|card|cvv|expiry|payment|passcode|otp|email|auth|session|credential|private[-_]?key|access[-_]?key|refresh[-_]?token|magic[-_]?link|verification|message|content|prompt|payload|provider|customer)/i

const TOKEN_VALUE_PATTERN = /\b(?:bearer\s+)?[a-z0-9_-]{24,}\.[a-z0-9._-]{12,}\.[a-z0-9._-]{12,}\b/i
const COOKIE_VALUE_PATTERN = /(cookie|set-cookie)\s*[:=]\s*[^\n]+/i
const EMAIL_VALUE_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const KEY_VALUE_SECRET_PATTERN = /(password|token|secret|authorization|api[-_]?key|refresh[-_]?token|access[-_]?token|cookie)\s*[:=]\s*[^\s,;]+/gi

type LogLevel = "info" | "warn" | "error"

export type ApiLogContext = {
  requestId: string
  route: string
  method: string
  userId?: string | null
  details?: Record<string, unknown>
  error?: unknown
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    if (TOKEN_VALUE_PATTERN.test(value) || COOKIE_VALUE_PATTERN.test(value) || EMAIL_VALUE_PATTERN.test(value)) {
      return "[REDACTED]"
    }

    if (KEY_VALUE_SECRET_PATTERN.test(value)) {
      return value.replace(KEY_VALUE_SECRET_PATTERN, "$1=[REDACTED]")
    }

    return value
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry))
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        return [key, "[REDACTED]"]
      }

      return [key, redactValue(entryValue)]
    })

    return Object.fromEntries(entries)
  }

  return value
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactValue(error.message),
    }
  }

  return String(error)
}

export function logApiEvent(level: LogLevel, event: string, context: ApiLogContext) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    requestId: context.requestId,
    route: context.route,
    method: context.method,
    userId: context.userId ?? null,
    details: redactValue(context.details ?? {}),
    ...(context.error ? { error: serializeError(context.error) } : {}),
  }

  if (level === "error") {
    console.error("[api]", JSON.stringify(payload))
    return
  }

  if (level === "warn") {
    console.warn("[api]", JSON.stringify(payload))
    return
  }

  console.info("[api]", JSON.stringify(payload))
}

export function createRequestLogContext(
  request: NextRequest,
  options?: { requestId?: string; details?: Record<string, unknown>; userId?: string | null },
): Omit<ApiLogContext, "error"> {
  return {
    requestId: options?.requestId ?? resolveRequestId(request),
    route: request.nextUrl.pathname,
    method: request.method,
    userId: options?.userId ?? null,
    details: options?.details,
  }
}

export function logApiRouteError(
  request: NextRequest,
  event: string,
  error: unknown,
  options?: { errorCode?: string; requestId?: string; userId?: string | null; details?: Record<string, unknown> },
) {
  logApiEvent("error", event, {
    ...createRequestLogContext(request, {
      requestId: options?.requestId,
      details: {
        errorCode: options?.errorCode ?? "INTERNAL_ERROR",
        ...(options?.details ?? {}),
      },
      userId: options?.userId,
    }),
    error,
  })
}
