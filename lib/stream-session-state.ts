type SessionRuntime = {
  likes: number
  comments: number
  shares: number
}

const runtime = new Map<string, SessionRuntime>()

export function getRuntime(streamId: string): SessionRuntime {
  const existing = runtime.get(streamId)
  if (existing) return existing
  const created = { likes: 0, comments: 0, shares: 0 }
  runtime.set(streamId, created)
  return created
}

export function applyChatEvent(streamId: string) {
  const data = getRuntime(streamId)
  data.comments += 1
  data.likes += 1
}

export function snapshotRuntime(streamId: string) {
  return { ...getRuntime(streamId) }
}
