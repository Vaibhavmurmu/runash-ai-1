import { neon } from "@neondatabase/serverless"

let _client: ReturnType<typeof neon> | null = null

const DATABASE_ENV_CANDIDATES = [
  "DATABASE_URL",
  "NEON_DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "runash_POSTGRES_URL",
  "runash_POSTGRES_URL_NON_POOLING",
] as const

const DATABASE_ENV_PRECEDENCE = DATABASE_ENV_CANDIDATES.join(" -> ")

function buildMissingDbEnvError(context?: string): Error {
  const contextNote = context ? ` (${context})` : ""
  return new Error(
    [
      `Database URL not configured${contextNote}.`,
      `Set one of: ${DATABASE_ENV_CANDIDATES.join(", ")}.`,
      `Fallback precedence: ${DATABASE_ENV_PRECEDENCE}.`,
      "Example: export DATABASE_URL='postgresql://user:pass@host/dbname'",
    ].join(" "),
  )
}

function resolveDatabaseUrl(): string | null {
  for (const key of DATABASE_ENV_CANDIDATES) {
    const value = process.env[key]
    if (value) return value
  }

  return null
}

export function assertDatabaseConfigured(context?: string): string {
  const url = resolveDatabaseUrl()
  if (!url) {
    throw buildMissingDbEnvError(context)
  }

  return url
}

function getClient() {
  if (_client) return _client

  let url: string
  try {
    url = assertDatabaseConfigured("lib/db.ts:getClient")
  } catch (error) {
    const errFn = (() => {
      throw error
    }) as unknown as ReturnType<typeof neon>

    _client = errFn
    return _client
  }

  _client = neon(url)
  return _client
}

export function getDatabaseEnvResolutionOrder(): readonly string[] {
  return DATABASE_ENV_CANDIDATES
}

export function sql<T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]> {
  const c = getClient() as any
  return c(strings, ...values)
}

;(sql as any).unsafe = (query: string, params?: any[]) => {
  const c = getClient() as any
  return c.unsafe(query, params)
}

export async function one<T = any>(queryPromise: Promise<T[]>): Promise<T | null> {
  const rows = await queryPromise
  return rows?.[0] ?? null
}

export async function queryOne<T = any>(query: string, params: any[] = []): Promise<T | null> {
  const rows = (await (sql as any).unsafe(query, params)) as T[]
  return rows?.[0] ?? null
}

export async function queryMany<T = any>(query: string, params: any[] = []): Promise<T[]> {
  const rows = (await (sql as any).unsafe(query, params)) as T[]
  return rows ?? []
}
