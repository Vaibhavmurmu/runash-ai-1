type FeatureFlagContext = {
  userId?: string
}

const STATIC_FLAG_MAP: Record<string, boolean> = {
  use_better_auth: true,
}

export async function isFeatureFlagEnabled(flagName: string, _context?: FeatureFlagContext): Promise<boolean> {
  const envKey = `FEATURE_FLAG_${flagName.toUpperCase()}`
  const envValue = process.env[envKey]

  if (typeof envValue === "string") {
    return envValue === "1" || envValue.toLowerCase() === "true"
  }

  return STATIC_FLAG_MAP[flagName] ?? false
}
