import assert from "node:assert/strict"
import test from "node:test"

import { verifyOTPWithClient } from "./otp"

type SQLCall = {
  text: string
  values: unknown[]
}

function createSQLMock(selectRows: Array<Record<string, unknown>>) {
  const calls: SQLCall[] = []

  const sqlMock = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("__param__")
    calls.push({ text, values })

    if (text.includes("SELECT * FROM otp_codes")) {
      return selectRows
    }

    return []
  }) as unknown as ReturnType<typeof import("@neondatabase/serverless").neon>

  return { sqlMock, calls }
}

test("verifyOTPWithClient verifies email OTP with explicit email predicate", async () => {
  const { sqlMock, calls } = createSQLMock([
    { id: 101, user_id: 88, attempts: 0, max_attempts: 5 },
  ])

  const result = await verifyOTPWithClient(sqlMock, "123456", "user@example.com", "login", "email")

  assert.deepEqual(result, {
    success: true,
    message: "OTP verified successfully",
    userId: 88,
  })

  const selectCall = calls.find((call) => call.text.includes("SELECT * FROM otp_codes"))
  assert.ok(selectCall)
  assert.match(selectCall.text, /WHERE email = __param__/)
  assert.doesNotMatch(selectCall.text, /WHERE phone_number = __param__/)

  const cleanupCall = calls.find(
    (call) => call.text.includes("SET is_active = false") && call.text.includes("id != __param__"),
  )
  assert.ok(cleanupCall)
  assert.match(cleanupCall.text, /WHERE email = __param__/)
})

test("verifyOTPWithClient verifies sms OTP with explicit phone predicate", async () => {
  const { sqlMock, calls } = createSQLMock([
    { id: 202, user_id: 99, attempts: 0, max_attempts: 5 },
  ])

  const result = await verifyOTPWithClient(sqlMock, "654321", "+12025550123", "login", "sms")

  assert.deepEqual(result, {
    success: true,
    message: "OTP verified successfully",
    userId: 99,
  })

  const selectCall = calls.find((call) => call.text.includes("SELECT * FROM otp_codes"))
  assert.ok(selectCall)
  assert.match(selectCall.text, /WHERE phone_number = __param__/)
  assert.doesNotMatch(selectCall.text, /WHERE email = __param__/)

  const cleanupCall = calls.find(
    (call) => call.text.includes("SET is_active = false") && call.text.includes("id != __param__"),
  )
  assert.ok(cleanupCall)
  assert.match(cleanupCall.text, /WHERE phone_number = __param__/)
})

test("verifyOTPWithClient rejects invalid email OTP code", async () => {
  const { sqlMock, calls } = createSQLMock([])

  const result = await verifyOTPWithClient(sqlMock, "000000", "user@example.com", "login", "email")

  assert.deepEqual(result, {
    success: false,
    message: "Invalid or expired OTP code",
  })
  assert.equal(calls.length, 1)
})

test("verifyOTPWithClient rejects invalid sms OTP code", async () => {
  const { sqlMock, calls } = createSQLMock([])

  const result = await verifyOTPWithClient(sqlMock, "000000", "+12025550123", "login", "sms")

  assert.deepEqual(result, {
    success: false,
    message: "Invalid or expired OTP code",
  })
  assert.equal(calls.length, 1)
})
