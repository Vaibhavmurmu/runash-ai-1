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
