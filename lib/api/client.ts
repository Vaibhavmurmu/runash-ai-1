import type { ApiErrorEnvelope, ApiSuccessEnvelope } from "@/lib/api/envelope"

type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope

type RequestConfig = {
  fallbackMessage: string
  init?: RequestInit
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isApiEnvelope<T>(payload: unknown): payload is ApiEnvelope<T> {
  return isObject(payload) && "success" in payload && "requestId" in payload && "error" in payload
}

export class ApiClientError extends Error {
  code: string
  requestId?: string
  status?: number

  constructor(message: string, options: { code?: string; requestId?: string; status?: number } = {}) {
    super(message)
    this.name = "ApiClientError"
    this.code = options.code ?? "API_REQUEST_FAILED"
    this.requestId = options.requestId
    this.status = options.status
  }
}

export async function fetchApiData<T>(input: RequestInfo | URL, config: RequestConfig): Promise<T> {
  const requestId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `req-${Date.now()}`
  const headers = new Headers(config.init?.headers)
  headers.set("x-request-id", requestId)

  const response = await fetch(input, { ...config.init, headers })
  const text = await response.text()
  const payload = text ? (JSON.parse(text) as unknown) : null

  if (!response.ok) {
    if (isApiEnvelope(payload) && payload.success === false) {
      throw new ApiClientError(payload.error.message, {
        code: payload.error.code,
        requestId: payload.requestId,
        status: response.status,
      })
    }

    const legacyMessage = isObject(payload) && typeof payload.error === "string" ? payload.error : config.fallbackMessage
    throw new ApiClientError(legacyMessage, { requestId: response.headers.get("x-request-id") ?? requestId, status: response.status })
  }

  if (isApiEnvelope<T>(payload)) {
    if (!payload.success) {
      throw new ApiClientError(payload.error.message, {
        code: payload.error.code,
        requestId: payload.requestId,
        status: response.status,
      })
    }

    return payload.data
  }

  return payload as T
}
