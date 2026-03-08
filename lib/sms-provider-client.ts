import { Buffer } from "node:buffer"

export type SmsDeliveryState = "sent" | "queued" | "failed"

export type SmsDeliveryResult = {
  success: boolean
  state: SmsDeliveryState
  provider: string
  providerMessageId?: string
  providerRequestId?: string
  retryCount?: number
  errorCode?: string
}

export type SmsOtpProviderSendInput = {
  phoneNumber: string
  code: string
  purpose: string
  requestId: string
}

export type SmsOtpProvider = {
  name: string
  sendOtp: (input: SmsOtpProviderSendInput) => Promise<SmsDeliveryResult>
}

type TwilioHttpResponse = {
  ok: boolean
  status: number
  json: () => Promise<Record<string, unknown>>
  text: () => Promise<string>
  headers?: { get: (name: string) => string | null }
}

type TwilioHttpClient = (input: RequestInfo | URL, init?: RequestInit) => Promise<TwilioHttpResponse>

type SmsProviderConfig = {
  provider: string
  maxRetries: number
  backoffBaseMs: number
  timeoutMs: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function buildTwilioAuthHeader(accountSid: string, authToken: string) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`
}

function parseTwilioState(status: string | undefined): SmsDeliveryState {
  if (!status) {
    return "queued"
  }

  const normalizedStatus = status.toLowerCase()
  if (normalizedStatus === "sent" || normalizedStatus === "delivered") {
    return "sent"
  }

  if (["queued", "accepted", "scheduled", "sending"].includes(normalizedStatus)) {
    return "queued"
  }

  return "failed"
}

function readSmsProviderConfig(): SmsProviderConfig {
  return {
    provider: process.env.OTP_SMS_PROVIDER?.toLowerCase() ?? "twilio",
    maxRetries: Number(process.env.OTP_SMS_PROVIDER_MAX_RETRIES ?? "3"),
    backoffBaseMs: Number(process.env.OTP_SMS_PROVIDER_BACKOFF_BASE_MS ?? "250"),
    timeoutMs: Number(process.env.OTP_SMS_PROVIDER_TIMEOUT_MS ?? "5000"),
  }
}

function normalizeProviderHttpErrorCode(status: number): string {
  if (status === 429) {
    return "provider_http_429"
  }

  if (status >= 500) {
    return `provider_http_${status}`
  }

  return `provider_http_${status}`
}

async function withTimeout(
  httpClient: TwilioHttpClient,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<TwilioHttpResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await httpClient(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

export function createTwilioSmsProvider(httpClient: TwilioHttpClient = fetch): SmsOtpProvider {
  return {
    name: "twilio",
    async sendOtp({ phoneNumber, code, purpose, requestId }: SmsOtpProviderSendInput): Promise<SmsDeliveryResult> {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      const fromNumber = process.env.TWILIO_PHONE_NUMBER

      if (!accountSid || !authToken || !fromNumber) {
        return {
          success: false,
          state: "failed",
          provider: "twilio",
          providerRequestId: requestId,
          errorCode: "twilio_config_missing",
        }
      }

      const config = readSmsProviderConfig()

      for (let attempt = 1; attempt <= config.maxRetries; attempt += 1) {
        try {
          const body = new URLSearchParams({
            To: phoneNumber,
            From: fromNumber,
            Body: `Your RunAsh OTP for ${purpose} is ${code}. It expires in 5 minutes.`,
          })

          const response = await withTimeout(
            httpClient,
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: buildTwilioAuthHeader(accountSid, authToken),
                "Content-Type": "application/x-www-form-urlencoded",
                "X-RunAsh-Request-Id": requestId,
              },
              body: body.toString(),
            },
            config.timeoutMs,
          )

          const providerRequestId = response.headers?.get("x-request-id") ?? requestId

          if (!response.ok) {
            const retryable = response.status === 429 || response.status >= 500
            if (retryable && attempt < config.maxRetries) {
              await sleep(config.backoffBaseMs * 2 ** (attempt - 1))
              continue
            }

            return {
              success: false,
              state: "failed",
              provider: "twilio",
              providerRequestId,
              retryCount: attempt - 1,
              errorCode: normalizeProviderHttpErrorCode(response.status),
            }
          }

          const payload = await response.json()
          const state = parseTwilioState(typeof payload.status === "string" ? payload.status : undefined)
          return {
            success: state !== "failed",
            state,
            provider: "twilio",
            providerMessageId: typeof payload.sid === "string" ? payload.sid : undefined,
            providerRequestId,
            retryCount: attempt - 1,
            errorCode: typeof payload.error_code === "string" ? payload.error_code : undefined,
          }
        } catch (error) {
          const timeoutError = error instanceof Error && error.name === "AbortError"
          if (attempt < config.maxRetries) {
            await sleep(config.backoffBaseMs * 2 ** (attempt - 1))
            continue
          }

          return {
            success: false,
            state: "failed",
            provider: "twilio",
            providerRequestId: requestId,
            retryCount: attempt - 1,
            errorCode: timeoutError ? "provider_timeout" : "provider_network_error",
          }
        }
      }

      return {
        success: false,
        state: "failed",
        provider: "twilio",
        providerRequestId: requestId,
        errorCode: "provider_retry_exhausted",
      }
    },
  }
}

export function createUnavailableSmsProvider(providerName: string): SmsOtpProvider {
  return {
    name: providerName,
    async sendOtp({ requestId }: SmsOtpProviderSendInput): Promise<SmsDeliveryResult> {
      return {
        success: false,
        state: "failed",
        provider: providerName,
        providerRequestId: requestId,
        errorCode: "sms_provider_not_configured",
      }
    },
  }
}

export function getSmsOtpProvider(): SmsOtpProvider {
  const config = readSmsProviderConfig()

  if (config.provider === "twilio") {
    return createTwilioSmsProvider()
  }

  if (config.provider === "mock") {
    return createUnavailableSmsProvider("mock")
  }

  return createUnavailableSmsProvider(config.provider)
}

