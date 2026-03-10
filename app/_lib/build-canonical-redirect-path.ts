type RedirectSearchParams = Record<string, string | string[] | undefined> | URLSearchParams

function normalizeSearchParams(searchParams?: RedirectSearchParams) {
  if (!searchParams) {
    return new URLSearchParams()
  }

  if (searchParams instanceof URLSearchParams) {
    return new URLSearchParams(searchParams)
  }

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) {
      continue
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry)
      }

      continue
    }

    params.append(key, value)
  }

  return params
}

export function buildCanonicalRedirectPath(pathname: string, searchParams?: RedirectSearchParams) {
  const normalizedSearchParams = normalizeSearchParams(searchParams)
  const query = normalizedSearchParams.toString()

  return query.length > 0 ? `${pathname}?${query}` : pathname
}

