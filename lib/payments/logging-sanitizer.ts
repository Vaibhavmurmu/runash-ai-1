const CARD_LIKE_KEY_PATTERN = /(pan|card|cardnumber|fullcardnumber|rawpan|primaryaccountnumber)/i
const CVV_KEY_PATTERN = /(cvv|securitycode|cvc)/i
const DIGITS_ONLY_PATTERN = /\D/g

function maskLast4(raw: string): string {
  const digits = raw.replace(DIGITS_ONLY_PATTERN, "")
  if (!digits) return "[REDACTED]"
  const last4 = digits.slice(-4)
  return `*${last4}`
}

export function sanitizePaymentActivityValue(key: string, value: unknown): unknown {
  if (typeof value === "string") {
    if (CVV_KEY_PATTERN.test(key)) {
      return "[REDACTED]"
    }

    if (CARD_LIKE_KEY_PATTERN.test(key)) {
      return maskLast4(value)
    }

    return value
  }

  if (typeof value === "number") {
    if (CVV_KEY_PATTERN.test(key)) return "[REDACTED]"
    if (CARD_LIKE_KEY_PATTERN.test(key)) return maskLast4(String(value))
    return value
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizePaymentActivityValue(key, entry))
  }

  if (value && typeof value === "object") {
    return sanitizePaymentActivityDetails(value as Record<string, unknown>)
  }

  return value
}

export function sanitizePaymentActivityDetails(details: Record<string, unknown> = {}): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(details)) {
    sanitized[key] = sanitizePaymentActivityValue(key, value)
  }

  return sanitized
}
