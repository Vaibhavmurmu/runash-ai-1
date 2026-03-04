import assert from "node:assert/strict"
import test from "node:test"

import { createDefaultLiveControlState, resolveVisibilityDefault } from "./stream-live-control.ts"

test("resolveVisibilityDefault uses private default for creators aged 13-17", () => {
  assert.equal(resolveVisibilityDefault(13), "private")
  assert.equal(resolveVisibilityDefault(17), "private")
})

test("resolveVisibilityDefault uses public default for creators aged 18+", () => {
  assert.equal(resolveVisibilityDefault(18), "public")
  assert.equal(resolveVisibilityDefault(42), "public")
})

test("resolveVisibilityDefault falls back to public when age is missing", () => {
  assert.equal(resolveVisibilityDefault(undefined), "public")
})


test("createDefaultLiveControlState enables weak-network fallback by default", () => {
  const state = createDefaultLiveControlState("stream_123")

  assert.equal(state.network.autoQualityFallbackOnWeakNetwork, true)
  assert.equal(state.network.dataSaverPreset, "balanced")
  assert.equal(state.network.manualFallbackOverride, "auto")
})
