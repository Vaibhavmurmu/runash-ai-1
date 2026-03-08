import assert from "node:assert/strict"
import test from "node:test"

import { NextRequest } from "next/server"
import { handleStreamEventsGet } from "./route-handler"

test("GET /api/stream-events parses filters and returns sorted ISO events", async () => {
  const request = new NextRequest(
    "http://localhost/api/stream-events?start=2026-01-01T00:00:00.000Z&end=2026-01-31T23:59:59.000Z&workspace=acme&platforms=youtube,twitch&platforms=kick&user=user-42",
  )

  let capturedFilters: Record<string, unknown> | undefined

  const response = await handleStreamEventsGet(request, {
    listEvents: async (filters) => {
      capturedFilters = filters as Record<string, unknown>
      return [
        {
          id: "event-b",
          title: "Later stream",
          start: "2026-01-04T10:00:00.000Z",
          end: "2026-01-04T11:00:00.000Z",
          platforms: ["Twitch"],
        },
        {
          id: "event-a",
          title: "Earlier stream",
          start: new Date("2026-01-03T10:00:00.000Z").toISOString(),
          end: new Date("2026-01-03T11:00:00.000Z").toISOString(),
          platforms: ["YouTube"],
        },
      ]
    },
  })

  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(capturedFilters?.platforms, ["youtube", "twitch", "kick"])
  assert.equal((capturedFilters?.start as Date).toISOString(), "2026-01-01T00:00:00.000Z")
  assert.equal((capturedFilters?.end as Date).toISOString(), "2026-01-31T23:59:59.000Z")
  assert.equal(capturedFilters?.workspace, "acme")
  assert.equal(capturedFilters?.userId, "user-42")

  assert.equal(Array.isArray(payload), true)
  assert.equal(payload[0].id, "event-a")
  assert.equal(payload[1].id, "event-b")
  assert.equal(payload[0].start, "2026-01-03T10:00:00.000Z")
  assert.equal(payload[0].end, "2026-01-03T11:00:00.000Z")
})

test("GET /api/stream-events returns empty list when repository has no events", async () => {
  const request = new NextRequest("http://localhost/api/stream-events?start=2026-01-01T00:00:00.000Z")

  const response = await handleStreamEventsGet(request, {
    listEvents: async () => [],
  })

  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(payload, [])
})
