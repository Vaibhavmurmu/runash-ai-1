import assert from "node:assert/strict"
import test from "node:test"

import { buildCanonicalRedirectPath } from "@/app/_lib/build-canonical-redirect-path"

test("buildCanonicalRedirectPath returns pathname when no query params are present", () => {
  assert.equal(buildCanonicalRedirectPath("/runashchat"), "/runashchat")
})

test("buildCanonicalRedirectPath appends record-based search params", () => {
  assert.equal(
    buildCanonicalRedirectPath("/editor", {
      invite: "abc123",
      source: "email",
    }),
    "/editor?invite=abc123&source=email",
  )
})

test("buildCanonicalRedirectPath appends URLSearchParams values", () => {
  const params = new URLSearchParams()
  params.append("resume", "last-live")
  params.append("scope", "team")

  assert.equal(buildCanonicalRedirectPath("/runashchat", params), "/runashchat?resume=last-live&scope=team")
})

test("buildCanonicalRedirectPath preserves repeated query keys", () => {
  assert.equal(
    buildCanonicalRedirectPath("/runashchat", {
      tag: ["a", "b"],
      ref: "invite",
    }),
    "/runashchat?tag=a&tag=b&ref=invite",
  )
})
