import assert from "node:assert/strict"
import test from "node:test"

import {
  resolveUpiFailureMessage,
  resolveUpiQrReadyMessage,
  resolveUpiSelectionTransition,
  resolveUpiSuccessMessage,
} from "./page"

test("checkout UPI select app flow transitions into redirect state", () => {
  const state = resolveUpiSelectionTransition("GPay")

  assert.equal(state.selectedUpiApp, "GPay")
  assert.equal(state.upiAuthStep, "redirecting")
})

test("checkout QR fallback generation flow exposes expected guidance message", () => {
  const message = resolveUpiQrReadyMessage()

  assert.equal(message, "Scan this QR in your UPI app and accept payment. Status will auto-check.")
})

test("checkout success/failure status messages remain stable for UI handling", () => {
  assert.equal(resolveUpiSuccessMessage(), "Payment accepted successfully in your UPI app.")
  assert.equal(resolveUpiFailureMessage(), "UPI authorization failed or timed out. Try again.")
})
