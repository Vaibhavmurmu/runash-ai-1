function readBooleanEnv(name: string): boolean {
  const value = process.env[name]
  if (typeof value !== "string") return false
  return value === "1" || value.toLowerCase() === "true"
}

export function isUpiSandboxCompleteEnabled(): boolean {
  return readBooleanEnv("FEATURE_FLAG_UPI_SANDBOX_COMPLETE")
}
