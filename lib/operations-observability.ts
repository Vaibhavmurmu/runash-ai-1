import { randomUUID } from "node:crypto"
import type { NextRequest } from "next/server"
import { resolveRequestId } from "@/lib/api/response"

type OperationMetricName =
  | "ops.session_start.success"
  | "ops.session_start.failed"
  | "ops.stream_uptime.seconds"
  | "ops.job_queue_latency.ms"
  | "ops.generation_failure.bucket"
  | "ops.media_ingest.success"
  | "ops.media_ingest.failed"
  | "ops.media_transcode.success"
  | "ops.media_transcode.failed"

export type OperationMetricPoint = {
  name: OperationMetricName
  value: number
  tags?: Record<string, string | number | boolean>
  timestamp: string
}

type SpanContext = {
  traceId: string
  spanId: string
  parentSpanId?: string
  correlationId?: string
}

const operationMetricBuffer: OperationMetricPoint[] = []
const MAX_OPERATION_METRICS = 1500
const SENSITIVE_TAG_PATTERN = /(token|secret|password|credential|authorization|cookie|email|card|cvv|otp|session|refresh|payload|auth|payment|message|content|prompt)/i

function sanitizeTags(tags?: Record<string, string | number | boolean>) {
  if (!tags) return undefined

  const sanitizedEntries = Object.entries(tags).map(([key, value]) => {
    if (SENSITIVE_TAG_PATTERN.test(key)) {
      return [key, "[REDACTED]"]
    }

    if (typeof value === "string" && SENSITIVE_TAG_PATTERN.test(value)) {
      return [key, "[REDACTED]"]
    }

    return [key, value]
  })

  return Object.fromEntries(sanitizedEntries)
}

export function resolveCorrelationId(request: NextRequest) {
  const fromHeader = request.headers.get("x-correlation-id") ?? request.headers.get("x-request-id")
  return (fromHeader?.trim() || resolveRequestId(request)).slice(0, 120)
}

export function recordOperationMetric(name: OperationMetricName, value = 1, tags?: Record<string, string | number | boolean>) {
  const metricPoint: OperationMetricPoint = {
    name,
    value,
    tags: sanitizeTags(tags),
    timestamp: new Date().toISOString(),
  }

  operationMetricBuffer.unshift(metricPoint)
  if (operationMetricBuffer.length > MAX_OPERATION_METRICS) {
    operationMetricBuffer.length = MAX_OPERATION_METRICS
  }

  console.info("[metrics.ops]", JSON.stringify(metricPoint))
}

export function recordGenerationFailureBucket(provider: string, code: string, tags?: Record<string, string | number | boolean>) {
  recordOperationMetric("ops.generation_failure.bucket", 1, {
    provider,
    code,
    ...(tags ?? {}),
  })
}

export function getOperationMetricsSnapshot(limit = 200) {
  return operationMetricBuffer.slice(0, limit)
}

export function getOpsAlertThresholds() {
  return {
    errorSpikeFailureBuckets5m: 20,
    stuckJobs15m: 8,
    queueLatencyP95Ms: 30_000,
    sessionStartFailureRate5m: 0.08,
    providerLatencyP95Ms: 4_000,
  }
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message }
  }

  return { message: String(error) }
}

export async function withOperationSpan<T>(
  name: string,
  options: {
    traceId?: string
    parentSpanId?: string
    correlationId?: string
    attributes?: Record<string, unknown>
  },
  run: (context: SpanContext) => Promise<T>,
): Promise<T> {
  const startedAt = Date.now()
  const context: SpanContext = {
    traceId: options.traceId ?? randomUUID(),
    spanId: randomUUID(),
    parentSpanId: options.parentSpanId,
    correlationId: options.correlationId,
  }

  console.info(
    "[trace]",
    JSON.stringify({
      event: "span.start",
      name,
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: context.parentSpanId ?? null,
      correlationId: context.correlationId ?? null,
      attributes: sanitizeTags((options.attributes ?? {}) as Record<string, string | number | boolean>),
      timestamp: new Date().toISOString(),
    }),
  )

  try {
    const result = await run(context)
    console.info(
      "[trace]",
      JSON.stringify({
        event: "span.end",
        name,
        traceId: context.traceId,
        spanId: context.spanId,
        correlationId: context.correlationId ?? null,
        durationMs: Date.now() - startedAt,
        status: "ok",
      }),
    )
    return result
  } catch (error) {
    console.error(
      "[trace]",
      JSON.stringify({
        event: "span.end",
        name,
        traceId: context.traceId,
        spanId: context.spanId,
        correlationId: context.correlationId ?? null,
        durationMs: Date.now() - startedAt,
        status: "error",
        error: serializeError(error),
      }),
    )
    throw error
  }
}
