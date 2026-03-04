const SENSITIVE_KEY_PATTERN =
  /(password|secret|token|authorization|cookie|api[-_]?key|card|cvv|expiry|payment|passcode|otp|email|auth|session|credential|private[-_]?key|access[-_]?key|refresh[-_]?token|magic[-_]?link|verification|provider|customer|bearer)/i

const TOKEN_VALUE_PATTERN = /\b(?:bearer\s+)?[a-z0-9_-]{24,}\.[a-z0-9._-]{12,}\.[a-z0-9._-]{12,}\b/i
const COOKIE_VALUE_PATTERN = /(cookie|set-cookie)\s*[:=]\s*[^\n]+/i
const EMAIL_VALUE_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const KEY_VALUE_SECRET_PATTERN =
  /(password|token|secret|authorization|api[-_]?key|refresh[-_]?token|access[-_]?token|cookie)\s*[:=]\s*[^\s,;]+/gi

export function redactAuthLogValue(value: unknown): unknown {
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
    return value.map((entry) => redactAuthLogValue(entry))
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        return [key, "[REDACTED]"]
      }

      return [key, redactAuthLogValue(entryValue)]
    })

    return Object.fromEntries(entries)
  }

  return value
}
