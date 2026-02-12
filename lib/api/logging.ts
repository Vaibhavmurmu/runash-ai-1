const SENSITIVE_KEY_PATTERN =
  /(password|secret|token|authorization|cookie|api[-_]?key|card|cvv|expiry|payment|passcode|otp|message|content|prompt)/i

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
      message: error.message,
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
