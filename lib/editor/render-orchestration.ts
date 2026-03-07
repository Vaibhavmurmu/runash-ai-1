export const editorRenderStatuses = ["queued", "processing", "retrying", "completed", "failed", "canceled"] as const

export type EditorRenderOrchestrationStatus = (typeof editorRenderStatuses)[number]

const transitionMap: Record<EditorRenderOrchestrationStatus, ReadonlySet<EditorRenderOrchestrationStatus>> = {
  queued: new Set(["processing", "canceled"]),
  processing: new Set(["retrying", "completed", "failed", "canceled"]),
  retrying: new Set(["queued", "processing", "failed", "canceled"]),
  completed: new Set([]),
  failed: new Set(["queued", "processing"]),
  canceled: new Set([]),
}

export function canTransitionRenderJob(
  current: EditorRenderOrchestrationStatus,
  next: EditorRenderOrchestrationStatus,
): boolean {
  return transitionMap[current].has(next)
}

export function assertRenderJobTransition(
  current: EditorRenderOrchestrationStatus,
  next: EditorRenderOrchestrationStatus,
): void {
  if (!canTransitionRenderJob(current, next)) {
    throw new Error(`Invalid render job transition: ${current} -> ${next}`)
  }
}

export function computeRetryBackoffMs(attemptNumber: number, baseDelayMs = 1500, maxDelayMs = 30_000) {
  const safeAttempt = Math.max(1, attemptNumber)
  const exponential = baseDelayMs * 2 ** (safeAttempt - 1)
  const jitter = Math.floor(Math.random() * Math.min(baseDelayMs, 500))
  return Math.min(exponential + jitter, maxDelayMs)
}

export function normalizeProviderOutput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {}
  const objectValue = value as Record<string, unknown>

  return {
    provider: typeof objectValue.provider === "string" ? objectValue.provider : "unknown",
    model: typeof objectValue.model === "string" ? objectValue.model : "unknown",
    latencyMs: typeof objectValue.latencyMs === "number" ? objectValue.latencyMs : null,
    finishReason: typeof objectValue.finishReason === "string" ? objectValue.finishReason : null,
    usage: objectValue.usage && typeof objectValue.usage === "object" ? objectValue.usage : {},
  }
}

export function mergeIdempotentCompletion<T extends { output?: { storageKey?: string; checksum?: string } }>(
  current: T,
  incoming: T,
): T {
  const currentKey = current.output?.storageKey
  const incomingKey = incoming.output?.storageKey

  if (currentKey && incomingKey && currentKey === incomingKey) {
    return current
  }

  if (current.output?.checksum && incoming.output?.checksum && current.output.checksum === incoming.output.checksum) {
    return current
  }

  return incoming
}
