import type { EmailEvent } from "./events"
import { resolveEmailEventId } from "./events"

const processedEventIds = new Map<string, number>()
const IDEMPOTENCY_TTL_MS = 1000 * 60 * 60

function cleanupIdempotencyMap(now = Date.now()) {
  for (const [key, ts] of processedEventIds.entries()) {
    if (now - ts > IDEMPOTENCY_TTL_MS) {
      processedEventIds.delete(key)
    }
  }
}

export function reserveEmailEvent(event: EmailEvent) {
  cleanupIdempotencyMap()
  const idempotencyKey = resolveEmailEventId(event)

  if (processedEventIds.has(idempotencyKey)) {
    return { accepted: false, idempotencyKey }
  }

  processedEventIds.set(idempotencyKey, Date.now())
  return { accepted: true, idempotencyKey }
}
