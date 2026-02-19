import assert from "node:assert/strict"
import test from "node:test"

import { isFeatureFlagEnabled } from "./feature-flags.ts"

test("percentage rollout enables deterministic cohort membership", async () => {
  delete process.env.FEATURE_FLAG_USE_BETTER_AUTH
  process.env.FEATURE_FLAG_USE_BETTER_AUTH_PERCENT = "10"

  const enabledForUserA = await isFeatureFlagEnabled("use_better_auth", { userId: "internal-user-a" })
  const enabledForUserARepeat = await isFeatureFlagEnabled("use_better_auth", { userId: "internal-user-a" })

  assert.equal(enabledForUserA, enabledForUserARepeat)
})

test("percentage rollout without user context only enables at 100%", async () => {
  delete process.env.FEATURE_FLAG_USE_BETTER_AUTH
  process.env.FEATURE_FLAG_USE_BETTER_AUTH_PERCENT = "50"

  const halfway = await isFeatureFlagEnabled("use_better_auth")

  process.env.FEATURE_FLAG_USE_BETTER_AUTH_PERCENT = "100"
  const full = await isFeatureFlagEnabled("use_better_auth")

  assert.equal(halfway, false)
  assert.equal(full, true)
})


test("percentage rollout expands deterministically as staged cohorts increase", async () => {
  delete process.env.FEATURE_FLAG_USE_BETTER_AUTH

  process.env.FEATURE_FLAG_USE_BETTER_AUTH_PERCENT = "10"
  const tenPercent = await isFeatureFlagEnabled("use_better_auth", { userId: "staged-user-42" })

  process.env.FEATURE_FLAG_USE_BETTER_AUTH_PERCENT = "50"
  const fiftyPercent = await isFeatureFlagEnabled("use_better_auth", { userId: "staged-user-42" })

  process.env.FEATURE_FLAG_USE_BETTER_AUTH_PERCENT = "100"
  const hundredPercent = await isFeatureFlagEnabled("use_better_auth", { userId: "staged-user-42" })

  assert.ok(Number(fiftyPercent) >= Number(tenPercent))
  assert.ok(hundredPercent)
})

test("percentage rollout values are clamped to a safe 0-100 range", async () => {
  delete process.env.FEATURE_FLAG_USE_BETTER_AUTH
  process.env.FEATURE_FLAG_USE_BETTER_AUTH_PERCENT = "-25"

  const belowZero = await isFeatureFlagEnabled("use_better_auth", { userId: "any-user" })

  process.env.FEATURE_FLAG_USE_BETTER_AUTH_PERCENT = "1000"
  const aboveHundred = await isFeatureFlagEnabled("use_better_auth")

  assert.equal(belowZero, false)
  assert.equal(aboveHundred, true)
})
