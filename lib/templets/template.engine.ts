type Primitive = string | number | boolean | null | undefined
type Data = Record<string, any>

function getByPath(obj: Data, path: string): Primitive {
  return path
    .split(".")
    .reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as any)[key] : undefined), obj) as Primitive
}

/**
 * Very small, safe mustache-like renderer with nested keys.
 * Unknown variables render as empty strings instead of throwing.
 * Example: renderTemplate("Hi {{ user.name }}", { user: { name: "Ada" } })
 */
export function renderTemplate(template: string, data: Data): string {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, expr: string) => {
    const val = getByPath(data, expr.trim())
    if (val === null || val === undefined) return ""
    return String(val)
  })
}
