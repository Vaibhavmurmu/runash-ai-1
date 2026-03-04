import { queryMany, queryOne } from "@/lib/db"
import { sanitizePaymentActivityDetails } from "@/lib/payments/logging-sanitizer"

export type AccountingEventType = "checkout_initiated" | "payment_succeeded" | "refund" | "chargeback" | "fee"
export type AccountingJurisdiction = "IN" | "US" | "GLOBAL"

type RevenueRecognitionCategory = "point_in_time" | "over_time" | "deferred"
type GaapAccountClassification = "asset" | "liability" | "equity" | "revenue" | "expense" | "contra_revenue"

type BaseAccountingEventInput = {
  eventType: AccountingEventType
  occurredAt: string
  amount: number
  currency: string
  taxAmount?: number
  feeAmount?: number
  merchantCountry: string
  merchantEntityId: string
  merchantId: string
  customerCountry?: string | null
  correlationKey: string
  idempotencyKey: string
  provider: "stripe" | "relay" | "internal"
  providerReference: string
  metadata?: Record<string, unknown>
}

export type NormalizedAccountingEvent = BaseAccountingEventInput & {
  jurisdiction: AccountingJurisdiction
  netAmount: number
  complianceMetadata: {
    invoiceTags: string[]
    journalTags: string[]
    regulatoryReportCode: string
    revenueRecognitionCategory: RevenueRecognitionCategory
    gaapAccountClassification: GaapAccountClassification
    salesTaxTreatment?: "tax_inclusive" | "tax_exclusive" | "non_taxable"
    gstSplit?: {
      cgst: number
      sgst: number
      igst: number
    }
  }
}

export type ChartAccountEntry = {
  role: "cash" | "accounts_receivable" | "revenue" | "tax_payable" | "fees_expense" | "chargeback_expense" | "refund_liability"
  code: string
  classification: GaapAccountClassification
}

type CountryChartMap = Record<AccountingEventType, ChartAccountEntry[]>

type AccountingChartConfig = {
  defaultCountry: string
  countryMappings: Record<string, CountryChartMap>
}

export const RUNASHBOOK_DEFAULT_CHART_CONFIG: AccountingChartConfig = {
  defaultCountry: "US",
  countryMappings: {
    IN: {
      checkout_initiated: [
        { role: "accounts_receivable", code: "IN-1100", classification: "asset" },
        { role: "revenue", code: "IN-4100", classification: "revenue" },
      ],
      payment_succeeded: [
        { role: "cash", code: "IN-1000", classification: "asset" },
        { role: "accounts_receivable", code: "IN-1100", classification: "asset" },
        { role: "tax_payable", code: "IN-2200", classification: "liability" },
      ],
      refund: [
        { role: "refund_liability", code: "IN-2300", classification: "liability" },
        { role: "cash", code: "IN-1000", classification: "asset" },
      ],
      chargeback: [
        { role: "chargeback_expense", code: "IN-5400", classification: "expense" },
        { role: "cash", code: "IN-1000", classification: "asset" },
      ],
      fee: [
        { role: "fees_expense", code: "IN-5300", classification: "expense" },
        { role: "cash", code: "IN-1000", classification: "asset" },
      ],
    },
    US: {
      checkout_initiated: [
        { role: "accounts_receivable", code: "US-1100", classification: "asset" },
        { role: "revenue", code: "US-4000", classification: "revenue" },
      ],
      payment_succeeded: [
        { role: "cash", code: "US-1000", classification: "asset" },
        { role: "revenue", code: "US-4000", classification: "revenue" },
        { role: "tax_payable", code: "US-2100", classification: "liability" },
      ],
      refund: [
        { role: "refund_liability", code: "US-2300", classification: "liability" },
        { role: "cash", code: "US-1000", classification: "asset" },
      ],
      chargeback: [
        { role: "chargeback_expense", code: "US-5200", classification: "expense" },
        { role: "cash", code: "US-1000", classification: "asset" },
      ],
      fee: [
        { role: "fees_expense", code: "US-5100", classification: "expense" },
        { role: "cash", code: "US-1000", classification: "asset" },
      ],
    },
  },
}

function normalizeCountry(value: string | null | undefined) {
  return String(value || "GLOBAL").toUpperCase()
}

function resolveJurisdiction(countryCode: string): AccountingJurisdiction {
  if (countryCode === "IN") return "IN"
  if (countryCode === "US") return "US"
  return "GLOBAL"
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function buildIndiaComplianceModel(event: BaseAccountingEventInput) {
  const intraState = normalizeCountry(event.customerCountry) === "IN"
  const taxAmount = round2(event.taxAmount ?? 0)
  const gstSplit = intraState
    ? { cgst: round2(taxAmount / 2), sgst: round2(taxAmount / 2), igst: 0 }
    : { cgst: 0, sgst: 0, igst: taxAmount }

  return {
    invoiceTags: ["IN_GST", intraState ? "GST_INTRASTATE" : "GST_INTERSTATE"],
    journalTags: ["runashbook", "india", event.eventType],
    regulatoryReportCode: "GST-OUTWARD",
    revenueRecognitionCategory: "point_in_time" as const,
    gaapAccountClassification: "revenue" as const,
    gstSplit,
  }
}

function buildUsComplianceModel(event: BaseAccountingEventInput) {
  const salesTaxTreatment = (event.taxAmount ?? 0) > 0 ? "tax_exclusive" : "non_taxable"

  return {
    invoiceTags: ["US_SALES_TAX", "ASC606"],
    journalTags: ["runashbook", "us", event.eventType],
    regulatoryReportCode: "US-SALES-TAX",
    revenueRecognitionCategory: "point_in_time" as const,
    gaapAccountClassification: event.eventType === "refund" ? ("contra_revenue" as const) : ("revenue" as const),
    salesTaxTreatment,
  }
}

export function normalizeAccountingEvent(event: BaseAccountingEventInput): NormalizedAccountingEvent {
  const merchantCountry = normalizeCountry(event.merchantCountry)
  const jurisdiction = resolveJurisdiction(merchantCountry)
  const taxAmount = round2(event.taxAmount ?? 0)
  const feeAmount = round2(event.feeAmount ?? 0)
  const netAmount = round2(event.amount - taxAmount - feeAmount)

  const complianceMetadata =
    jurisdiction === "IN" ? buildIndiaComplianceModel(event) : jurisdiction === "US" ? buildUsComplianceModel(event) : {
      invoiceTags: ["GLOBAL"],
      journalTags: ["runashbook", event.eventType],
      regulatoryReportCode: "GLOBAL-DEFAULT",
      revenueRecognitionCategory: "point_in_time" as const,
      gaapAccountClassification: "revenue" as const,
    }

  return {
    ...event,
    merchantCountry,
    jurisdiction,
    currency: String(event.currency || "USD").toUpperCase(),
    taxAmount,
    feeAmount,
    netAmount,
    complianceMetadata,
  }
}

export function resolveChartOfAccountsMapping(
  countryCode: string,
  eventType: AccountingEventType,
  config: AccountingChartConfig = RUNASHBOOK_DEFAULT_CHART_CONFIG,
): ChartAccountEntry[] {
  const normalizedCountry = normalizeCountry(countryCode)
  const fallbackCountry = normalizeCountry(config.defaultCountry)
  const byCountry = config.countryMappings[normalizedCountry] ?? config.countryMappings[fallbackCountry]
  return byCountry?.[eventType] ?? []
}

async function ensureAccountingTablesReady() {
  await queryMany(`
    CREATE TABLE IF NOT EXISTS runash_accounting_posts (
      id UUID PRIMARY KEY,
      idempotency_key TEXT UNIQUE NOT NULL,
      correlation_key TEXT NOT NULL,
      event_type TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      merchant_entity_id TEXT NOT NULL,
      merchant_country TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_reference TEXT NOT NULL,
      payload JSONB NOT NULL,
      posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

function safeAccountingLog(level: "info" | "warn" | "error", message: string, details: Record<string, unknown>) {
  const sanitized = sanitizePaymentActivityDetails(details)
  const logPayload = {
    ...sanitized,
    metadata: sanitizePaymentActivityDetails((sanitized.metadata ?? {}) as Record<string, unknown>),
  }

  if (level === "error") {
    console.error(message, logPayload)
    return
  }

  if (level === "warn") {
    console.warn(message, logPayload)
    return
  }

  console.info(message, logPayload)
}

export async function postAccountingEvent(input: {
  event: BaseAccountingEventInput
  chartConfig?: AccountingChartConfig
}) {
  await ensureAccountingTablesReady()

  const normalizedEvent = normalizeAccountingEvent(input.event)
  const coa = resolveChartOfAccountsMapping(normalizedEvent.merchantCountry, normalizedEvent.eventType, input.chartConfig)

  const existing = await queryOne<{ id: string; posted_at: string }>(
    `SELECT id, posted_at FROM runash_accounting_posts WHERE idempotency_key = $1 LIMIT 1`,
    [normalizedEvent.idempotencyKey],
  )

  if (existing) {
    safeAccountingLog("info", "runashbook.accounting_post.duplicate", {
      idempotencyKey: normalizedEvent.idempotencyKey,
      correlationKey: normalizedEvent.correlationKey,
      eventType: normalizedEvent.eventType,
      merchantId: normalizedEvent.merchantId,
      providerReference: normalizedEvent.providerReference,
    })

    return { posted: false, duplicate: true, postingId: existing.id, postedAt: existing.posted_at, event: normalizedEvent, coa }
  }

  const postingId = crypto.randomUUID()
  await queryMany(
    `
      INSERT INTO runash_accounting_posts (
        id, idempotency_key, correlation_key, event_type, merchant_id, merchant_entity_id, merchant_country,
        provider, provider_reference, payload
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
      ON CONFLICT (idempotency_key) DO NOTHING
    `,
    [
      postingId,
      normalizedEvent.idempotencyKey,
      normalizedEvent.correlationKey,
      normalizedEvent.eventType,
      normalizedEvent.merchantId,
      normalizedEvent.merchantEntityId,
      normalizedEvent.merchantCountry,
      normalizedEvent.provider,
      normalizedEvent.providerReference,
      JSON.stringify({ event: normalizedEvent, chartOfAccounts: coa }),
    ],
  )

  safeAccountingLog("info", "runashbook.accounting_post.created", {
    postingId,
    eventType: normalizedEvent.eventType,
    merchantId: normalizedEvent.merchantId,
    correlationKey: normalizedEvent.correlationKey,
    idempotencyKey: normalizedEvent.idempotencyKey,
    provider: normalizedEvent.provider,
    providerReference: normalizedEvent.providerReference,
  })

  return { posted: true, duplicate: false, postingId, event: normalizedEvent, coa }
}
