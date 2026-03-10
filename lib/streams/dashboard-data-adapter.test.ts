import assert from "node:assert/strict"
import test from "node:test"

import { adaptDashboardStreams } from "@/lib/streams/dashboard-data-adapter"

test("adaptDashboardStreams normalizes live, scheduled, and history buckets", () => {
  const buckets = adaptDashboardStreams({
    recent: [
      {
        id: "live-1",
        title: "Live now",
        date: "2026-01-01T10:00:00.000Z",
        viewers: 32,
        duration: null,
        status: "live",
        url: "/live/1",
      },
      {
        id: "ended-1",
        title: "Ended",
        date: "2026-01-01T08:00:00.000Z",
        viewers: 80,
        duration: "00:45:00",
        status: "ended",
        url: "/live/2",
      },
    ],
    scheduled: [
      {
        id: "sched-1",
        title: "Upcoming",
        startsAt: "2026-01-02T08:00:00.000Z",
        status: "scheduled",
      },
    ],
  })

  assert.equal(buckets.liveSessions.length, 1)
  assert.equal(buckets.scheduledStreams.length, 1)
  assert.equal(buckets.endedStreams.length, 1)
  assert.equal(buckets.liveSessions[0].kind, "live")
  assert.equal(buckets.scheduledStreams[0].kind, "scheduled")
  assert.equal(buckets.endedStreams[0].kind, "history")
})
