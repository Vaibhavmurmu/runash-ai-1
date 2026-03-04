import assert from "node:assert/strict"
import test from "node:test"

import { calculateInvoiceTotals } from "@/lib/billing/invoice-calculations"

test("invoice create lifecycle totals compute subtotal/tax/total in cents", () => {
  const totals = calculateInvoiceTotals(
    [
      { quantity: 1, unitAmount: 10 },
      { quantity: 2, unitAmount: 5.5 },
    ],
    2.25,
  )

  assert.equal(totals.subtotalCents, 2100)
  assert.equal(totals.taxCents, 225)
  assert.equal(totals.totalCents, 2325)
})
