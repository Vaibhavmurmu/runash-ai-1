import assert from "node:assert/strict"
import test from "node:test"

interface ListenerRegistry {
  [event: string]: EventListenerOrEventListenerObject[]
}

function createEventTargetMock() {
  const listeners: ListenerRegistry = {}

  return {
    listeners,
    addEventListener: (event: string, listener: EventListenerOrEventListenerObject) => {
      listeners[event] ??= []
      listeners[event].push(listener)
    },
    removeEventListener: (event: string, listener: EventListenerOrEventListenerObject) => {
      listeners[event] = (listeners[event] ?? []).filter((candidate) => candidate !== listener)
    },
  }
}

test("BackgroundSync destroy detaches registered browser listeners", async () => {
  const windowMock = createEventTargetMock()
  const documentMock = {
    ...createEventTargetMock(),
    hidden: true,
  }

  Object.assign(globalThis, {
    navigator: { onLine: true },
    window: windowMock,
    document: documentMock,
    localStorage: {
      getItem: () => null,
      setItem: () => undefined,
    },
    crypto: { randomUUID: () => "id" },
  })

  const { BackgroundSync } = await import("./background-sync")
  const sync = BackgroundSync.getInstance()

  assert.equal(windowMock.listeners.online?.length, 1)
  assert.equal(windowMock.listeners.offline?.length, 1)
  assert.equal(documentMock.listeners.visibilitychange?.length, 1)

  sync.destroy()

  assert.equal(windowMock.listeners.online?.length ?? 0, 0)
  assert.equal(windowMock.listeners.offline?.length ?? 0, 0)
  assert.equal(documentMock.listeners.visibilitychange?.length ?? 0, 0)

  ;(BackgroundSync as unknown as { instance: unknown }).instance = undefined
})
