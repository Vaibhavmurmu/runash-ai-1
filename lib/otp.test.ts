import assert from "node:assert/strict"
import test from "node:test"

import { createSMSOTPWithClient } from "./otp"
import { createTwilioSmsProvider } from "./sms-provider-client"

type SQLCall = { text: string; values: unknown[] }

type HeadersLike = { get: (name: string) => string | null }

function createSqlMock() {
  const calls: SQLCall[] = []
  const sqlClient = async (strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ text: strings.join("__param__"), values })
    return []
  }

  return { sqlClient, calls }
}

function withEnv(vars: Record<string, string | undefined>, run: () => Promise<void>) {
  const previous = new Map<string, string | undefined>()

  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, process.env[key])
    if (typeof value === "undefined") {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  return run().finally(() => {
    for (const [key, value] of previous.entries()) {
      if (typeof value === "undefined") {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })
}

test("createTwilioSmsProvider sends SMS and returns queued state metadata", async () => {
  await withEnv(
    {
      TWILIO_ACCOUNT_SID: "AC123",
      TWILIO_AUTH_TOKEN: "token",
      TWILIO_PHONE_NUMBER: "+15551234567",
      OTP_SMS_PROVIDER_MAX_RETRIES: "2",
      OTP_SMS_PROVIDER_BACKOFF_BASE_MS: "0",
    },
    async () => {
      const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = []
      const httpClient = async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ input, init })
        const headers: HeadersLike = { get: () => "twilio-request-1" }
        return {
          ok: true,
          status: 201,
          headers,
          json: async () => ({ sid: "SM123", status: "queued" }),
          text: async () => "",
        }
      }

      const provider = createTwilioSmsProvider(httpClient)
      const result = await provider.sendOtp({
        phoneNumber: "+15557654321",
        code: "112233",
        purpose: "login",
        requestId: "req-1",
      })

      assert.equal(calls.length, 1)
      assert.equal(result.success, true)
      assert.equal(result.state, "queued")
      assert.equal(result.providerMessageId, "SM123")
      assert.equal(result.providerRequestId, "twilio-request-1")
      assert.equal(result.retryCount, 0)
    },
  )
})

test("createTwilioSmsProvider retries on retryable HTTP errors and succeeds", async () => {
  await withEnv(
    {
      TWILIO_ACCOUNT_SID: "AC123",
      TWILIO_AUTH_TOKEN: "token",
      TWILIO_PHONE_NUMBER: "+15551234567",
      OTP_SMS_PROVIDER_MAX_RETRIES: "3",
      OTP_SMS_PROVIDER_BACKOFF_BASE_MS: "0",
    },
    async () => {
      let attempt = 0
      const httpClient = async () => {
        attempt += 1
        if (attempt < 3) {
          return {
            ok: false,
            status: 503,
            headers: { get: () => "req-retry" },
            json: async () => ({}),
            text: async () => "service unavailable",
          }
        }

        return {
          ok: true,
          status: 201,
          headers: { get: () => "req-retry" },
          json: async () => ({ sid: "SM456", status: "sent" }),
          text: async () => "",
        }
      }

      const provider = createTwilioSmsProvider(httpClient)
      const result = await provider.sendOtp({
        phoneNumber: "+15557654321",
        code: "778899",
        purpose: "login",
        requestId: "req-retry",
      })

      assert.equal(attempt, 3)
      assert.equal(result.success, true)
      assert.equal(result.state, "sent")
      assert.equal(result.retryCount, 2)
    },
  )
})

test("createSMSOTPWithClient returns failure on provider send failure", async () => {
  const { sqlClient } = createSqlMock()

  const response = await createSMSOTPWithClient(sqlClient, "+15550001111", "2fa_login", {
    checkRateLimit: async () => ({ allowed: true, attemptsLeft: 4 }),
    deliverSmsOtp: async () => ({
      success: false,
      state: "failed",
      provider: "twilio",
      providerRequestId: "req-fail",
      errorCode: "twilio_http_500",
    }),
  })

  assert.equal(response.success, false)
  assert.equal(response.message, "Failed to send SMS OTP")
})

test("createSMSOTPWithClient treats queued provider response as success", async () => {
  const { sqlClient } = createSqlMock()

  const response = await createSMSOTPWithClient(sqlClient, "+15550002222", "2fa_login", {
    checkRateLimit: async () => ({ allowed: true, attemptsLeft: 4 }),
    deliverSmsOtp: async () => ({
      success: true,
      state: "queued",
      provider: "twilio",
      providerRequestId: "req-ok",
      providerMessageId: "SM000",
    }),
  })

  assert.equal(response.success, true)
  assert.equal(response.expiresIn, 300)
})


test("createSMSOTPWithClient fails when SMS provider is unconfigured in production", async () => {
  const { sqlClient } = createSqlMock()

  await withEnv(
    {
      NODE_ENV: "production",
      OTP_SMS_PROVIDER: undefined,
      OTP_SMS_MOCK_ENABLED: undefined,
      TWILIO_ACCOUNT_SID: undefined,
      TWILIO_AUTH_TOKEN: undefined,
      TWILIO_PHONE_NUMBER: undefined,
    },
    async () => {
      const response = await createSMSOTPWithClient(sqlClient, "+15550003333", "2fa_login", {
        checkRateLimit: async () => ({ allowed: true, attemptsLeft: 4 }),
      })

      assert.equal(response.success, false)
      assert.equal(response.message, "Failed to send SMS OTP")
    },
  )
})

test("createSMSOTPWithClient rejects mock provider so test env does not emit false success", async () => {
  const { sqlClient } = createSqlMock()

  await withEnv(
    {
      NODE_ENV: "development",
      OTP_SMS_PROVIDER: "mock",
      OTP_SMS_MOCK_ENABLED: "true",
      TWILIO_ACCOUNT_SID: undefined,
      TWILIO_AUTH_TOKEN: undefined,
      TWILIO_PHONE_NUMBER: undefined,
    },
    async () => {
      const response = await createSMSOTPWithClient(sqlClient, "+15550004444", "2fa_login", {
        checkRateLimit: async () => ({ allowed: true, attemptsLeft: 4 }),
      })

      assert.equal(response.success, false)
      assert.equal(response.message, "Failed to send SMS OTP")
    },
  )
})


test("createSMSOTPWithClient keeps rate-limit short-circuit behavior unchanged", async () => {
  const { sqlClient, calls } = createSqlMock()
  let providerCalled = false

  const response = await createSMSOTPWithClient(sqlClient, "+15550005555", "2fa_login", {
    checkRateLimit: async () => ({ allowed: false, attemptsLeft: 0, blockedUntil: new Date("2099-01-01T00:00:00Z") }),
    deliverSmsOtp: async () => {
      providerCalled = true
      return {
        success: true,
        state: "sent",
        provider: "twilio",
      }
    },
  })

  assert.equal(response.success, false)
  assert.equal(providerCalled, false)
  assert.equal(calls.length, 0)
})

test("createTwilioSmsProvider returns failure for outage/network exception without false success", async () => {
  await withEnv(
    {
      TWILIO_ACCOUNT_SID: "AC123",
      TWILIO_AUTH_TOKEN: "token",
      TWILIO_PHONE_NUMBER: "+15551234567",
      OTP_SMS_PROVIDER_MAX_RETRIES: "2",
      OTP_SMS_PROVIDER_BACKOFF_BASE_MS: "0",
      OTP_SMS_PROVIDER_TIMEOUT_MS: "10",
    },
    async () => {
      let attempts = 0
      const provider = createTwilioSmsProvider(async () => {
        attempts += 1
        throw new Error("network down")
      })

      const result = await provider.sendOtp({
        phoneNumber: "+15557654321",
        code: "123456",
        purpose: "login",
        requestId: "req-outage",
      })

      assert.equal(attempts, 2)
      assert.equal(result.success, false)
      assert.equal(result.state, "failed")
      assert.equal(result.errorCode, "provider_network_error")
    },
  )
})
