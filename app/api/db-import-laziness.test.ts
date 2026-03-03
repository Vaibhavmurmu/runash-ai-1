import assert from "node:assert/strict"
import test from "node:test"

const DB_ENV_KEYS = [
  "DATABASE_URL",
  "NEON_DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "runash_POSTGRES_URL",
  "runash_POSTGRES_URL_NON_POOLING",
] as const

const ROUTE_MODULES = [
  "./sync/route.ts",
  "./upload/route.ts",
  "./analytics/route.ts",
  "./recordings/clips/route.ts",
  "./recordings/storage/route.ts",
  "./recordings/[id]/share/route.ts",
  "./recordings/[id]/download/route.ts",
] as const

test("high-traffic API route modules do not crash during import when DB env vars are unset", async () => {
  const originalEnv = new Map<string, string | undefined>()

  for (const key of DB_ENV_KEYS) {
    originalEnv.set(key, process.env[key])
    delete process.env[key]
  }

  try {
    for (const routeModule of ROUTE_MODULES) {
      const routeUrl = new URL(routeModule, import.meta.url)
      routeUrl.searchParams.set("case", `${Date.now()}-${Math.random()}`)

      await assert.doesNotReject(import(routeUrl.href), `Import should not throw for ${routeModule}`)
    }
  } finally {
    for (const [key, value] of originalEnv.entries()) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
})
