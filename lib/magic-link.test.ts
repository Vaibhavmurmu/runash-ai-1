import assert from "node:assert/strict"
import test from "node:test"

import { verifyMagicLinkTokenWithClient } from "./magic-link"

type SQLCall = { text: string; values: unknown[] }

function createSQLMock(rowsPerSelect: Array<Array<Record<string, unknown>>>) {
  const calls: SQLCall[] = []
  let selectIndex = 0

  const sqlMock = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("__param__")
    calls.push({ text, values })

    if (text.includes("SELECT t.*")) {
      const rows = rowsPerSelect[selectIndex] ?? []
      selectIndex += 1
      return rows
    }

    return []
  }) as unknown as ReturnType<typeof import("@neondatabase/serverless").neon>

  return { sqlMock, calls }
}

test("verifyMagicLinkTokenWithClient consumes token and rejects replay", async () => {
  const tokenRow = {
    user_id: 7,
    email: "magic@example.com",
    name: "Magic User",
    avatar_url: null,
    role: "user",
  }
  const { sqlMock, calls } = createSQLMock([[tokenRow], []])

  const firstAttempt = await verifyMagicLinkTokenWithClient(sqlMock, "token-123")
  const secondAttempt = await verifyMagicLinkTokenWithClient(sqlMock, "token-123")

  assert.equal(firstAttempt.success, true)
  assert.equal(firstAttempt.user.id, 7)
  assert.equal(secondAttempt.success, false)

  const updateUsedCall = calls.find((call) => call.text.includes("SET used = true"))
  assert.ok(updateUsedCall)
})
