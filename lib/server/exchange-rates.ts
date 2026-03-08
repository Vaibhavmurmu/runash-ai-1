import "server-only"

import { createServerNeonClient } from "@/lib/neon/server"

export interface StoredExchangeRate {
  from: string
  to: string
  rate: number
  lastUpdated: string
}

interface ProviderResponse {
  success?: boolean
  rates?: Record<string, number>
  date?: string
}

const DEFAULT_SUPPORTED_CURRENCIES = ["USD", "INR"]
const FRESHNESS_MS = 15 * 60 * 1000
const MAX_STALE_MS = 24 * 60 * 60 * 1000

const memoryCache = new Map<string, { rates: StoredExchangeRate[]; fetchedAt: number }>()

function cacheKey(currencies: string[]) {
  return [...currencies].sort().join(",")
}

function buildCrossRates(baseRates: Record<string, number>, asOfISO: string): StoredExchangeRate[] {
  const entries = Object.entries(baseRates)
  const rates: StoredExchangeRate[] = []

  for (const [from, fromRate] of entries) {
    if (fromRate <= 0) continue

    for (const [to, toRate] of entries) {
      if (to === from || toRate <= 0) continue

      rates.push({
        from,
        to,
        rate: toRate / fromRate,
        lastUpdated: asOfISO,
      })
    }
  }

  return rates
}

async function readRatesFromDb(currencies: string[]): Promise<StoredExchangeRate[]> {
  const neon = createServerNeonClient()
  const { data, error } = await neon.from("exchange_rates").select("from_currency,to_currency,rate,last_updated")

  if (error || !data) {
    return []
  }

  const currencySet = new Set(currencies)

  return data
    .filter((row) => currencySet.has(row.from_currency) && currencySet.has(row.to_currency))
    .map((row) => ({
      from: row.from_currency,
      to: row.to_currency,
      rate: Number(row.rate),
      lastUpdated: new Date(row.last_updated).toISOString(),
    }))
}

async function persistRatesToDb(rates: StoredExchangeRate[]) {
  if (rates.length === 0) return

  const neon = createServerNeonClient()
  const payload = rates.map((rate) => ({
    from_currency: rate.from,
    to_currency: rate.to,
    rate: rate.rate,
    last_updated: rate.lastUpdated,
  }))

  await neon.from("exchange_rates").upsert(payload, { onConflict: "from_currency,to_currency" })
}

async function fetchFromProvider(currencies: string[]): Promise<StoredExchangeRate[]> {
  const symbols = currencies.join(",")
  const response = await fetch(`https://api.exchangerate.host/latest?base=USD&symbols=${encodeURIComponent(symbols)}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Provider returned non-OK status")
  }

  const payload = (await response.json()) as ProviderResponse

  if (payload.success === false || !payload.rates) {
    throw new Error("Provider payload missing rates")
  }

  const baseRates: Record<string, number> = { USD: 1 }
  for (const currency of currencies) {
    const rate = payload.rates[currency]
    if (typeof rate === "number" && rate > 0) {
      baseRates[currency] = rate
    }
  }

  if (Object.keys(baseRates).length < 2) {
    throw new Error("Provider payload does not include enough currencies")
  }

  const asOfISO = payload.date ? new Date(`${payload.date}T00:00:00.000Z`).toISOString() : new Date().toISOString()
  return buildCrossRates(baseRates, asOfISO)
}

export async function getExchangeRatesSnapshot({
  forceRefresh = false,
  currencies = DEFAULT_SUPPORTED_CURRENCIES,
}: {
  forceRefresh?: boolean
  currencies?: string[]
}) {
  const normalizedCurrencies = [...new Set(currencies.map((currency) => currency.toUpperCase()))]
  const key = cacheKey(normalizedCurrencies)
  const cached = memoryCache.get(key)

  if (!forceRefresh && cached && Date.now() - cached.fetchedAt < FRESHNESS_MS) {
    return {
      rates: cached.rates,
      source: "memory-cache" as const,
      fetchedAt: new Date(cached.fetchedAt).toISOString(),
      stale: false,
    }
  }

  try {
    const providerRates = await fetchFromProvider(normalizedCurrencies)
    const fetchedAt = Date.now()
    memoryCache.set(key, { rates: providerRates, fetchedAt })
    await persistRatesToDb(providerRates)

    return {
      rates: providerRates,
      source: "provider" as const,
      fetchedAt: new Date(fetchedAt).toISOString(),
      stale: false,
    }
  } catch {
    const dbRates = await readRatesFromDb(normalizedCurrencies)
    if (dbRates.length > 0) {
      const newest = Math.max(...dbRates.map((rate) => new Date(rate.lastUpdated).getTime()))
      memoryCache.set(key, { rates: dbRates, fetchedAt: newest })
      return {
        rates: dbRates,
        source: "database" as const,
        fetchedAt: new Date(newest).toISOString(),
        stale: Date.now() - newest > FRESHNESS_MS,
      }
    }

    if (cached) {
      return {
        rates: cached.rates,
        source: "stale-memory-cache" as const,
        fetchedAt: new Date(cached.fetchedAt).toISOString(),
        stale: true,
      }
    }

    return {
      rates: [],
      source: "unavailable" as const,
      fetchedAt: null,
      stale: true,
    }
  }
}

export { DEFAULT_SUPPORTED_CURRENCIES, FRESHNESS_MS, MAX_STALE_MS }
