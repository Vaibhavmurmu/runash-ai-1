import type { NextRequest } from "next/server"

import {
  respondError as respondErrorBase,
  respondSuccess as respondSuccessBase,
  resolveRequestId,
  type ApiEnvelopeError,
  type ApiMeta,
} from "@/lib/api/response"

export type ApiSuccessEnvelope<T> = {
  success: true
  data: T
  error: null
  requestId: string
  meta?: ApiMeta
}

export type ApiErrorEnvelope = {
  success: false
  data: null
  error: ApiEnvelopeError
  requestId: string
  meta?: ApiMeta
}

type EnvelopeOptions = {
  status?: number
  meta?: ApiMeta
  legacy?: Record<string, unknown>
  requestId?: string
}

export function respondSuccess<T>(request: NextRequest, data: T, options: EnvelopeOptions = {}) {
  return respondSuccessBase(request, data, options)
}

export function respondError(
  request: NextRequest,
  error: ApiEnvelopeError,
  options: EnvelopeOptions = {},
) {
  return respondErrorBase(request, error, options)
}
