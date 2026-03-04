import test from "node:test"
import assert from "node:assert/strict"

import {
  normalizeAccountingEvent,
  resolveChartOfAccountsMapping,
  RUNASHBOOK_DEFAULT_CHART_CONFIG,
} from "@/lib/services/runashbook-accounting-service"

test("India adapter normalizes GST split for intrastate events", () => {
  const event = normalizeAccountingEvent({
    eventType: "payment_succeeded",
    occurredAt: "2026-02-26T00:00:00.000Z",
    amount: 118,
    taxAmount: 18,
    feeAmount: 2,
    currency: "inr",
    merchantCountry: "IN",
    merchantEntityId: "org_1",
    merchantId: "merchant_1",
    customerCountry: "IN",
    correlationKey: "corr_1",
    idempotencyKey: "idem_1",
    provider: "stripe",
    providerReference: "pi_1",
  })

  assert.equal(event.jurisdiction, "IN")
  assert.equal(event.netAmount, 98)
  assert.deepEqual(event.complianceMetadata.gstSplit, { cgst: 9, sgst: 9, igst: 0 })
  assert.ok(event.complianceMetadata.invoiceTags.includes("IN_GST"))
})

test("US adapter exposes GAAP metadata and deterministic chart mapping", () => {
  const event = normalizeAccountingEvent({
    eventType: "refund",
    occurredAt: "2026-02-26T00:00:00.000Z",
    amount: 100,
    taxAmount: 0,
    feeAmount: 0,
    currency: "usd",
    merchantCountry: "US",
    merchantEntityId: "org_2",
    merchantId: "merchant_2",
    customerCountry: "US",
    correlationKey: "corr_2",
    idempotencyKey: "idem_2",
    provider: "stripe",
    providerReference: "re_1",
  })

  assert.equal(event.complianceMetadata.revenueRecognitionCategory, "point_in_time")
  assert.equal(event.complianceMetadata.gaapAccountClassification, "contra_revenue")

  const coa = resolveChartOfAccountsMapping("US", "refund", RUNASHBOOK_DEFAULT_CHART_CONFIG)
  assert.deepEqual(
    coa.map((entry) => entry.code),
    ["US-2300", "US-1000"],
  )
})
