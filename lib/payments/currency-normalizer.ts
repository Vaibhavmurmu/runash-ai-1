const DEFAULT_USD_TO_INR_RATE = 83

const MINOR_UNIT_SCALE: Record<string, number> = {
  USD: 100,
  INR: 100,
}

function getMinorUnitScale(currency: string): number {
  return MINOR_UNIT_SCALE[currency.toUpperCase()] ?? 100
}

export function normalizeToMinorUnits(amount: number, currency: string): number {
  const scale = getMinorUnitScale(currency)
  return Math.round(amount * scale)
}

export function normalizeFromMinorUnits(amountMinor: number, currency: string): number {
  const scale = getMinorUnitScale(currency)
  return amountMinor / scale
}

export function convertMinorAmount(input: { amountMinor: number; fromCurrency: string; toCurrency: string; usdToInrRate?: number }): number {
  const from = input.fromCurrency.toUpperCase()
  const to = input.toCurrency.toUpperCase()

  if (from === to) return input.amountMinor

  const usdToInrRate = Number.isFinite(input.usdToInrRate) ? Number(input.usdToInrRate) : DEFAULT_USD_TO_INR_RATE

  const majorFrom = normalizeFromMinorUnits(input.amountMinor, from)
  if (from === "USD" && to === "INR") {
    return normalizeToMinorUnits(majorFrom * usdToInrRate, to)
  }

  if (from === "INR" && to === "USD") {
    return normalizeToMinorUnits(majorFrom / usdToInrRate, to)
  }

  throw new Error(`Unsupported currency conversion from ${from} to ${to}`)
}

export function isAmountAboveUsdEquivalentThreshold(input: {
  amountMinor: number
  currency: string
  usdThresholdCents: number
  usdToInrRate?: number
}): boolean {
  const normalized = convertMinorAmount({
    amountMinor: input.amountMinor,
    fromCurrency: input.currency,
    toCurrency: "USD",
    usdToInrRate: input.usdToInrRate,
  })

  return normalized > input.usdThresholdCents
}

export function toUsdEquivalentCents(input: { amountMinor: number; currency: string; usdToInrRate?: number }): number {
  return convertMinorAmount({
    amountMinor: input.amountMinor,
    fromCurrency: input.currency,
    toCurrency: "USD",
    usdToInrRate: input.usdToInrRate,
  })
}

export function toInrEquivalentPaise(input: { amountMinor: number; currency: string; usdToInrRate?: number }): number {
  return convertMinorAmount({
    amountMinor: input.amountMinor,
    fromCurrency: input.currency,
    toCurrency: "INR",
    usdToInrRate: input.usdToInrRate,
  })
}

export function normalizePolicyThresholdAmounts(input: { amountMinor: number; currency: string; usdToInrRate?: number }) {
  const currency = input.currency.toUpperCase()
  const usdEquivalentCents = toUsdEquivalentCents({
    amountMinor: input.amountMinor,
    currency,
    usdToInrRate: input.usdToInrRate,
  })

  const inrEquivalentPaise = toInrEquivalentPaise({
    amountMinor: input.amountMinor,
    currency,
    usdToInrRate: input.usdToInrRate,
  })

  return {
    currency,
    usdEquivalentCents,
    inrEquivalentPaise,
  }
}
