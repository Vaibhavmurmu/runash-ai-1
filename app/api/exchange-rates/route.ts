import { NextRequest, NextResponse } from "next/server"

import { DEFAULT_SUPPORTED_CURRENCIES, FRESHNESS_MS, MAX_STALE_MS, getExchangeRatesSnapshot } from "@/lib/server/exchange-rates"

function parseCurrencies(input: string | null): string[] {
  if (!input) return DEFAULT_SUPPORTED_CURRENCIES
  return input
    .split(",")
    .map((currency) => currency.trim().toUpperCase())
    .filter(Boolean)
}

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "true"
  const requestedCurrencies = parseCurrencies(request.nextUrl.searchParams.get("currencies"))

  const snapshot = await getExchangeRatesSnapshot({
    forceRefresh,
    currencies: requestedCurrencies,
  })

  const availableCurrencies = new Set(snapshot.rates.flatMap((rate) => [rate.from, rate.to]))
  const unavailableCurrencies = requestedCurrencies.filter((currency) => !availableCurrencies.has(currency))

  const fetchedAtMs = snapshot.fetchedAt ? new Date(snapshot.fetchedAt).getTime() : null
  const ageMs = fetchedAtMs ? Date.now() - fetchedAtMs : null
  const stale = ageMs !== null ? ageMs > FRESHNESS_MS : true
  const tooOld = ageMs !== null ? ageMs > MAX_STALE_MS : true

  if (snapshot.rates.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "Exchange rates are currently unavailable",
        unavailableCurrencies,
        stale,
        tooOld,
      },
      { status: 503 },
    )
  }

  return NextResponse.json({
    success: true,
    rates: snapshot.rates,
    supportedCurrencies: requestedCurrencies.filter((currency) => availableCurrencies.has(currency)),
    unavailableCurrencies,
    fetchedAt: snapshot.fetchedAt,
    source: snapshot.source,
    stale,
    tooOld,
  })
}
