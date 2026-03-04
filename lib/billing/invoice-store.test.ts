import assert from "node:assert/strict"
import test from "node:test"

import { resolveInvoiceLifecycleStatus } from "./invoice-store"

test("invoice lifecycle transitions to paid on successful payment attempts", () => {
  assert.equal(
    resolveInvoiceLifecycleStatus({
      currentStatus: "open",
      attemptStatus: "succeeded",
      dueDateIso: null,
      now: new Date("2026-03-01T00:00:00.000Z"),
    }),
    "paid",
  )
})

test("failed/incomplete retry flows preserve backward-compatible open/uncollectible status behavior", () => {
  assert.equal(
    resolveInvoiceLifecycleStatus({
      currentStatus: "open",
      attemptStatus: "payment_failed",
      dueDateIso: "2026-03-10T00:00:00.000Z",
      now: new Date("2026-03-01T00:00:00.000Z"),
    }),
    "open",
  )

  assert.equal(
    resolveInvoiceLifecycleStatus({
      currentStatus: "open",
      attemptStatus: "payment_failed",
      dueDateIso: "2026-02-10T00:00:00.000Z",
      now: new Date("2026-03-01T00:00:00.000Z"),
    }),
    "uncollectible",
  )

  assert.equal(
    resolveInvoiceLifecycleStatus({
      currentStatus: "open",
      attemptStatus: "pending",
      dueDateIso: "2026-02-10T00:00:00.000Z",
      now: new Date("2026-03-01T00:00:00.000Z"),
    }),
    "open",
  )
})
