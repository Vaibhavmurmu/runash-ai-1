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

function createAdapters() {
  const windowTarget = createEventTargetMock()
  const documentTarget = {
    ...createEventTargetMock(),
    hidden: true,
  }

  return {
    windowTarget,
    documentTarget,
    adapters: {
      windowTarget,
      documentTarget,
      getIsOnline: () => true,
      storage: {
        getItem: () => null,
        setItem: () => undefined,
      },
    },
  }
}

test("BackgroundSync destroy detaches registered browser listeners", async () => {
  const { BackgroundSync } = await import("./background-sync")
  const { adapters, windowTarget, documentTarget } = createAdapters()
  const sync = new BackgroundSync(adapters)

  assert.equal(windowTarget.listeners.online?.length, 1)
  assert.equal(windowTarget.listeners.offline?.length, 1)
  assert.equal(documentTarget.listeners.visibilitychange?.length, 1)

  sync.destroy()

  assert.equal(windowTarget.listeners.online?.length ?? 0, 0)
  assert.equal(windowTarget.listeners.offline?.length ?? 0, 0)
  assert.equal(documentTarget.listeners.visibilitychange?.length ?? 0, 0)

  BackgroundSync.resetInstanceForTests()
})

test("BackgroundSync can re-init after destroy without duplicate listeners", async () => {
  const { BackgroundSync } = await import("./background-sync")
  const { adapters, windowTarget, documentTarget } = createAdapters()

  const first = new BackgroundSync(adapters)
  assert.equal(windowTarget.listeners.online?.length, 1)
  assert.equal(windowTarget.listeners.offline?.length, 1)
  assert.equal(documentTarget.listeners.visibilitychange?.length, 1)

  first.destroy()
  const second = new BackgroundSync(adapters)

  assert.equal(windowTarget.listeners.online?.length, 1)
  assert.equal(windowTarget.listeners.offline?.length, 1)
  assert.equal(documentTarget.listeners.visibilitychange?.length, 1)

  second.destroy()
  BackgroundSync.resetInstanceForTests()
})
