type FeatureFlagContext = {
  userId?: string
}

const STATIC_FLAG_MAP: Record<string, boolean> = {
  use_better_auth: true,
  allow_legacy_next_auth_fallback: false,
  enforce_legacy_next_auth_fallback_sunset: false,
}

function readPercentFlag(flagName: string): number | null {
  const envKey = `FEATURE_FLAG_${flagName.toUpperCase()}_PERCENT`
  const envValue = process.env[envKey]

  if (typeof envValue !== "string") {
    return null
  }

  const parsed = Number.parseInt(envValue, 10)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.max(0, Math.min(parsed, 100))
}

function hashToPercent(input: string): number {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 100
  }

  return hash
}

export async function isFeatureFlagEnabled(flagName: string, context?: FeatureFlagContext): Promise<boolean> {
  const envKey = `FEATURE_FLAG_${flagName.toUpperCase()}`
  const envValue = process.env[envKey]

  if (typeof envValue === "string") {
    return envValue === "1" || envValue.toLowerCase() === "true"
  }

  const percent = readPercentFlag(flagName)
  if (percent !== null) {
    if (!context?.userId) {
      return percent >= 100
    }

    return hashToPercent(context.userId) < percent
  }

  return STATIC_FLAG_MAP[flagName] ?? false
}
