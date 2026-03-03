import assert from "node:assert/strict"
import test from "node:test"

import { decodeMobileCursor, encodeMobileCursor } from "@/lib/chat-contracts"

test("mobile cursor encode/decode roundtrip", () => {
  const encoded = encodeMobileCursor(42)
  assert.equal(encoded, "mc_42")
  assert.equal(decodeMobileCursor(encoded), 42)
})

test("mobile cursor handles invalid and legacy values", () => {
  assert.equal(decodeMobileCursor(undefined), 0)
  assert.equal(decodeMobileCursor("not-a-cursor"), 0)
  assert.equal(decodeMobileCursor("2026-02-28T00:00:00.000Z"), 0)
})
