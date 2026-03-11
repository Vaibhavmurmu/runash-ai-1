import assert from "node:assert/strict"
import test, { mock } from "node:test"

import {
  createLiveStream,
  deleteScheduledStream,
  listDashboardStreams,
  scheduleStream,
  updateScheduledStream,
} from "@/lib/streams/dashboard-client"

test("dashboard client list/create/update/delete calls expected REST endpoints", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []

  const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init })

    if (String(input).includes("/api/dashboard/streams?")) {
      return Response.json({ data: { streams: [{ id: "r1", title: "recent", date: new Date().toISOString(), viewers: 0, duration: null, url: "", status: "live" }] } })
    }

    if (String(input).includes("/api/dashboard/streams/scheduled") && !init?.method) {
      return Response.json({ streams: [{ id: "s1", title: "scheduled", startsAt: new Date().toISOString(), status: "scheduled" }] })
    }

    return new Response(null, { status: 200 })
  })

  const listed = await listDashboardStreams()
  assert.equal(listed.recent.length, 1)
  assert.equal(listed.scheduled.length, 1)

  await createLiveStream("Launch")
  await scheduleStream("Schedule", new Date().toISOString())
  await updateScheduledStream("s1", { title: "Updated" })
  await deleteScheduledStream("s1")

  assert.equal(calls[2]?.url, "/api/dashboard/streams/start")
  assert.equal(calls[2]?.init?.method, "POST")
  assert.equal(calls[3]?.url, "/api/dashboard/streams/schedule")
  assert.equal(calls[3]?.init?.method, "POST")
  assert.equal(calls[4]?.url, "/api/dashboard/streams/schedule/s1")
  assert.equal(calls[4]?.init?.method, "PATCH")
  assert.equal(calls[5]?.url, "/api/dashboard/streams/schedule/s1")
  assert.equal(calls[5]?.init?.method, "DELETE")

  fetchMock.mock.restore()
})
