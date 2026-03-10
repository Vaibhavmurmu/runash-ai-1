type RedirectSearchParams = Record<string, string | string[] | undefined>

export function buildCanonicalRedirectPath(pathname: string, searchParams?: RedirectSearchParams) {
  if (!searchParams) return pathname

  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      query.set(key, value)
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item)
      }
    }
  }

  const serializedQuery = query.toString()
  return serializedQuery ? `${pathname}?${serializedQuery}` : pathname
}
