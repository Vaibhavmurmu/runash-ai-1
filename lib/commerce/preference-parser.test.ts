import assert from "node:assert/strict"
import test from "node:test"

import { parseBuyerPreferences } from "@/lib/commerce/preference-parser"

test("parseBuyerPreferences extracts budget, currency, category, and priorities", () => {
  const parsed = parseBuyerPreferences(
    "find best under $120 in skincare organic cruelty-free brand like Acme, EcoGlow with niacinamide, fragrance-free",
  )

  assert.equal(parsed.budget_ceiling, 120)
  assert.equal(parsed.currency, "USD")
  assert.equal(parsed.category, "skincare")
  assert.ok(parsed.sustainability_requirements.includes("organic"))
  assert.ok(parsed.sustainability_requirements.includes("cruelty-free"))
  assert.ok(parsed.brand_priorities.length >= 1)
  assert.ok(parsed.spec_priorities.length >= 1)
})
