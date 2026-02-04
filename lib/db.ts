import { neon } from "@neondatabase/serverless"

let _client: ReturnType<typeof neon> | null = null

function getClient() {
  if (_client) return _client
  const url =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.runash_POSTGRES_URL ||
    process.env.runash_POSTGRES_URL_NON_POOLING

  if (!url) {
    const errFn = (() => {
      throw new Error("Database URL not configured. Set POSTGRES_URL.")
    }) as unknown as ReturnType<typeof neon>
    _client = errFn
    return _client
  }
  _client = neon(url)
  return _client
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
