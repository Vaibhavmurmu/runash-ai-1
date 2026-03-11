"use client"

import { useState, useEffect, useCallback } from "react"

interface ExchangeRate {
  from: string
  to: string
  rate: number
  lastUpdated: Date
}

interface ConversionResult {
  originalAmount: number
  convertedAmount: number
  fromCurrency: string
  toCurrency: string
  exchangeRate: number
}

interface ExchangeRatesApiResponse {
  success: boolean
  rates?: Array<{ from: string; to: string; rate: number; lastUpdated: string }>
  supportedCurrencies?: string[]
  unavailableCurrencies?: string[]
  fetchedAt?: string | null
  stale?: boolean
  tooOld?: boolean
  error?: string
}

const DEFAULT_SUPPORTED_CURRENCIES = ["USD", "INR"]
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  INR: "₹",
}
const STALE_REVALIDATE_INTERVAL_MS = 5 * 60 * 1000

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>(DEFAULT_SUPPORTED_CURRENCIES)
  const [unavailableCurrencies, setUnavailableCurrencies] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [revalidating, setRevalidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null)

  const applyRatesResponse = useCallback((payload: ExchangeRatesApiResponse) => {
    if (!payload.success || !payload.rates) {
      const apiError = payload.error ?? "Failed to fetch exchange rates"
      setError(apiError)
      setUnavailableCurrencies(payload.unavailableCurrencies ?? [])
      return false
    }

    const parsedRates = payload.rates.map((rate) => ({
      from: rate.from,
      to: rate.to,
      rate: rate.rate,
      lastUpdated: new Date(rate.lastUpdated),
    }))

    setRates(parsedRates)
    setSupportedCurrencies(payload.supportedCurrencies?.length ? payload.supportedCurrencies : DEFAULT_SUPPORTED_CURRENCIES)
    setUnavailableCurrencies(payload.unavailableCurrencies ?? [])
    setLastFetchedAt(payload.fetchedAt ? new Date(payload.fetchedAt) : new Date())

    if (payload.tooOld) {
      setError("Exchange rates are too old to use safely. Please try again shortly.")
      return false
    }

    if (payload.stale) {
      setError("Showing cached exchange rates while fresh data is loading.")
    } else {
      setError(null)
    }

    return true
  }, [])

  const fetchRates = useCallback(
    async ({ forceRefresh = false, background = false }: { forceRefresh?: boolean; background?: boolean } = {}) => {
      if (background) {
        setRevalidating(true)
      } else {
        setLoading(true)
      }

      try {
        const response = await fetch(`/api/exchange-rates${forceRefresh ? "?refresh=true" : ""}`, {
          cache: "no-store",
        })
        const payload = (await response.json()) as ExchangeRatesApiResponse

        if (!response.ok || !applyRatesResponse(payload)) {
          return false
        }

        return true
      } catch {
        setError("Could not reach exchange-rate service.")
        return false
      } finally {
        if (background) {
          setRevalidating(false)
        } else {
          setLoading(false)
        }
      }
    },
    [applyRatesResponse],
  )

  useEffect(() => {
    fetchRates()
  }, [fetchRates])

  useEffect(() => {
    if (!lastFetchedAt) return

    const age = Date.now() - lastFetchedAt.getTime()
    const delay = Math.max(STALE_REVALIDATE_INTERVAL_MS - age, 0)

    const timer = window.setTimeout(() => {
      fetchRates({ background: true, forceRefresh: true })
    }, delay)

    return () => window.clearTimeout(timer)
  }, [lastFetchedAt, fetchRates])

  const getRate = useCallback(
    (from: string, to: string): number => {
      const normalizedFrom = from.toUpperCase()
      const normalizedTo = to.toUpperCase()

      if (normalizedFrom === normalizedTo) return 1

      if (unavailableCurrencies.includes(normalizedFrom) || unavailableCurrencies.includes(normalizedTo)) {
        throw new Error(`Currency not currently available: ${normalizedFrom} or ${normalizedTo}`)
      }

      const directRate = rates.find((rate) => rate.from === normalizedFrom && rate.to === normalizedTo)
      if (directRate) return directRate.rate

      throw new Error(`No exchange rate available for ${normalizedFrom} → ${normalizedTo}`)
    },
    [rates, unavailableCurrencies],
  )

  return {
    rates,
    loading,
    revalidating,
    error,
    fetchRates,
    getRate,
    supportedCurrencies,
    unavailableCurrencies,
    lastFetchedAt,
  }
}

export function useCurrencyConverter() {
  const { getRate, supportedCurrencies, unavailableCurrencies, fetchRates, revalidating } = useExchangeRates()
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const convertCurrency = useCallback(
    async (amount: number, fromCurrency: string, toCurrency: string): Promise<ConversionResult> => {
      setConverting(true)
      setError(null)

      try {
        const exchangeRate = getRate(fromCurrency, toCurrency)
        const convertedAmount = amount * exchangeRate

        return {
          originalAmount: amount,
          convertedAmount: Math.round(convertedAmount * 100) / 100,
          fromCurrency,
          toCurrency,
          exchangeRate,
        }
      } catch {
        const errorMessage = `Currency conversion unavailable for ${fromCurrency} → ${toCurrency}.`
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setConverting(false)
      }
    },
    [getRate],
  )

  const formatCurrency = useCallback((amount: number, currency: string, locale = "en-US"): string => {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
    } catch {
      const symbol = CURRENCY_SYMBOLS[currency] || currency
      return `${symbol}${amount.toFixed(2)}`
    }
  }, [])

  const getCurrencySymbol = useCallback((currency: string): string => {
    return CURRENCY_SYMBOLS[currency] || currency
  }, [])

  const getSupportedCurrencies = useCallback((): string[] => {
    return supportedCurrencies
  }, [supportedCurrencies])

  return {
    convertCurrency,
    formatCurrency,
    getCurrencySymbol,
    getSupportedCurrencies,
    refreshRates: () => fetchRates({ forceRefresh: true }),
    unavailableCurrencies,
    revalidating,
    converting,
    error,
  }
}
