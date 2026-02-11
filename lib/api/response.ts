export type ApiMeta = Record<string, unknown>

export type ApiEnvelopeError = {
  code: string
  message: string
  details?: unknown
}

type ResponseOptions = {
  status?: number
  meta?: ApiMeta
  legacy?: Record<string, unknown>
  requestId?: string
}

function sanitizeLegacy(legacy?: Record<string, unknown>) {
  if (!legacy) {
    return {}
  }

  const { success, data, error, requestId, meta, ...safeLegacy } = legacy
  void success
  void data
  void error
  void requestId
  void meta

  return safeLegacy
}

export function resolveRequestId(request: Request) {
  return request.headers.get("x-request-id") || request.headers.get("x-correlation-id") || crypto.randomUUID()
}

function createResponseInit(status: number, requestId: string) {
  return {
    status,
    headers: {
      "x-request-id": requestId,
    },
  }
}

export function respondSuccess<T>(request: Request, data: T, options: ResponseOptions = {}) {
  const requestId = options.requestId ?? resolveRequestId(request)
  const payload = {
    success: true as const,
    data,
    error: null,
    requestId,
    ...(options.meta ? { meta: options.meta } : {}),
  }

  return Response.json({ ...payload, ...sanitizeLegacy(options.legacy) }, createResponseInit(options.status ?? 200, requestId))
}

export function respondError(request: Request, error: ApiEnvelopeError, options: ResponseOptions = {}) {
  const requestId = options.requestId ?? resolveRequestId(request)
  const payload = {
    success: false as const,
    data: null,
    error,
    requestId,
    ...(options.meta ? { meta: options.meta } : {}),
  }

  return Response.json({ ...payload, ...sanitizeLegacy(options.legacy) }, createResponseInit(options.status ?? 500, requestId))
}
