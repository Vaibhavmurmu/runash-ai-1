export type EmailDispatchModule = "contact" | "newsletter" | "billing"

function readBooleanEnv(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]
  if (typeof value !== "string") return defaultValue
  return value === "1" || value.toLowerCase() === "true"
}

export function isEmailDispatchModuleEnabled(module: EmailDispatchModule): boolean {
  const key = module.toUpperCase()
  const enabled = readBooleanEnv(`FEATURE_FLAG_EMAIL_DISPATCH_${key}`, true)
  const rollback = readBooleanEnv(`FEATURE_FLAG_EMAIL_DISPATCH_${key}_ROLLBACK`, false)
  return enabled && !rollback
}

export function resolveDispatchModule(metadata?: Record<string, unknown>): EmailDispatchModule {
  const moduleValue = String(metadata?.module || metadata?.dispatch_module || "newsletter").toLowerCase()
  if (moduleValue === "contact" || moduleValue === "newsletter" || moduleValue === "billing") {
    return moduleValue
  }

  const category = String(metadata?.category || "").toLowerCase()
  if (category.includes("billing")) return "billing"
  if (category.includes("contact")) return "contact"
  return "newsletter"
}
