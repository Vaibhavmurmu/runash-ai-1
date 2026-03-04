import assert from "node:assert/strict"
import test from "node:test"

import { evaluateWalletSecurityControls } from "@/lib/payments/wallet-security-controls"

test("blocks link checkout when validator HITL/MFA controls are unmet", () => {
  const decision = evaluateWalletSecurityControls({
    actionType: "link_checkout",
    amountMinor: 2_000_000,
    currency: "INR",
    humanConfirmed: false,
    mfaVerified: false,
  })

  assert.equal(decision.allowed, false)
  assert.equal(decision.reasonCodes.includes("HITL_CONFIRMATION_REQUIRED"), true)
  assert.equal(decision.reasonCodes.includes("MFA_REQUIRED"), true)
})

test("marks geo mismatch as review for high-risk wallet actions with HITL+MFA present", () => {
  const decision = evaluateWalletSecurityControls({
    actionType: "wallet_default_method_change",
    humanConfirmed: true,
    mfaVerified: true,
    userCountry: "IN",
    requestCountry: "US",
  })

  assert.equal(decision.allowed, true)
  assert.equal(decision.requiresReview, true)
  assert.equal(decision.reasonCodes.includes("GEO_MISMATCH_REVIEW"), true)
})

test("blocks high-risk wallet actions without HITL+MFA", () => {
  const decision = evaluateWalletSecurityControls({
    actionType: "wallet_subscription_state_change",
    humanConfirmed: false,
    mfaVerified: false,
  })

  assert.equal(decision.allowed, false)
  assert.equal(decision.reasonCodes.includes("ACTION_REQUIRES_HITL"), true)
  assert.equal(decision.reasonCodes.includes("ACTION_REQUIRES_MFA"), true)
})
