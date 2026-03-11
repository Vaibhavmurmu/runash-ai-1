import assert from "node:assert/strict"
import test from "node:test"

import { AnalyticsService } from "@/lib/analytics-service"

type MockResponse = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

function createResponse(payload: unknown, ok = true, status = 200): MockResponse {
  return {
    ok,
    status,
    json: async () => payload,
  }
}

test("analytics service uses session-backed overview endpoint", async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = []
  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ input: String(input), init })
    return createResponse({ totalViews: 10, revenue: 5, avgWatchTimeSeconds: 60, engagementRate: 2, change: {} }) as any
  }) as any

  const service = AnalyticsService.getInstance()
  await service.getOverviewAnalytics("7d", "stream_1")

  assert.equal(calls.length, 1)
  assert.equal(calls[0].input, "/api/analytics/overview?period=7d&streamId=stream_1")
  assert.equal(calls[0].init?.credentials, "include")
})

test("analytics service uses standardized historical and realtime endpoints", async () => {
  const calls: string[] = []
  global.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input))
    return createResponse({ viewerCounts: [], chatActivity: [], followerGrowth: [], revenue: [], engagement: [], watchTime: [] }) as any
  }) as any

  const service = AnalyticsService.getInstance()
  await service.getHistoricalAnalytics("30d", "stream_2")

  global.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input))
    return createResponse({
      totalViews: 0,
      currentViewers: 0,
      peakViewers: 0,
      averageViewers: 0,
      watchTime: 0,
      chatMessages: 0,
      newFollowers: 0,
      donations: 0,
      engagement: 0,
      streamHealth: "Good",
      revenue: 0,
      subscriptions: 0,
    }) as any
  }) as any

  await service.getRealTimeAnalytics("stream_2")

  assert.deepEqual(calls, ["/api/analytics/historical?period=30d&streamId=stream_2", "/api/analytics/realtime?streamId=stream_2"])
})


test("analytics service includes filters in historical and content analytics requests", async () => {
  const calls: string[] = []
  global.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input))
    return createResponse({ viewerCounts: [], chatActivity: [], followerGrowth: [], revenue: [], engagement: [], watchTime: [] }) as any
  }) as any

  const service = AnalyticsService.getInstance()
  await service.getHistoricalAnalytics("30d", "stream_2", {
    platforms: ["twitch", "youtube"],
    categories: ["gaming"],
    streamTypes: ["live"],
  })

  global.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input))
    return createResponse({ topClips: [], topMoments: [], categoryPerformance: [] }) as any
  }) as any

  await service.getContentAnalytics("30d", "stream_2", {
    platforms: ["twitch", "youtube"],
    categories: ["gaming"],
    streamTypes: ["live"],
  })

  assert.deepEqual(calls, [
    "/api/analytics/historical?period=30d&streamId=stream_2&platforms=twitch%2Cyoutube&categories=gaming&streamTypes=live",
    "/api/analytics/content?period=30d&streamId=stream_2&platforms=twitch%2Cyoutube&categories=gaming&streamTypes=live",
  ])
})

test("analytics realtime stream subscription emits payloads", async () => {
  const service = AnalyticsService.getInstance() as any

  class MockEventSource {
    onmessage: ((event: { data: string }) => void) | null = null
    onerror: ((error: unknown) => void) | null = null
    url: string
    closed = false

    constructor(url: string) {
      this.url = url
      ;(globalThis as any).__lastEventSource = this
    }

    close() {
      this.closed = true
    }
  }

  ;(global as any).EventSource = MockEventSource as any

  let received = 0
  const unsubscribe = service.subscribeToRealTimeUpdates("stream_3", () => {
    received += 1
  })

  const es = (globalThis as any).__lastEventSource as MockEventSource
  assert.equal(es.url, "/api/analytics/realtime/stream?streamId=stream_3")

  es.onmessage?.({
    data: JSON.stringify({
      totalViews: 1,
      currentViewers: 1,
      peakViewers: 1,
      averageViewers: 1,
      watchTime: 1,
      chatMessages: 1,
      newFollowers: 1,
      donations: 1,
      engagement: 1,
      streamHealth: "Excellent",
      revenue: 1,
      subscriptions: 1,
    }),
  })

  assert.equal(received, 1)
  unsubscribe()
  assert.equal(es.closed, true)

  service.eventSource = null
  service.realTimeCallbacks.clear()
})

test("integration path: overview + historical + realtime contract", async () => {
  const endpoints: string[] = []
  global.fetch = (async (input: string | URL | Request) => {
    const url = String(input)
    endpoints.push(url)

    if (url.startsWith("/api/analytics/overview")) {
      return createResponse({ totalViews: 20, revenue: 10, avgWatchTimeSeconds: 100, engagementRate: 5, change: {} }) as any
    }

    if (url.startsWith("/api/analytics/historical")) {
      return createResponse({ viewerCounts: [], chatActivity: [], followerGrowth: [], revenue: [], engagement: [], watchTime: [] }) as any
    }

    return createResponse({
      totalViews: 0,
      currentViewers: 0,
      peakViewers: 0,
      averageViewers: 0,
      watchTime: 0,
      chatMessages: 0,
      newFollowers: 0,
      donations: 0,
      engagement: 0,
      streamHealth: "Good",
      revenue: 0,
      subscriptions: 0,
    }) as any
  }) as any

  const service = AnalyticsService.getInstance()
  await Promise.all([
    service.getOverviewAnalytics("7d"),
    service.getHistoricalAnalytics("7d"),
    service.getRealTimeAnalytics(),
  ])

  assert.deepEqual(endpoints, ["/api/analytics/overview?period=7d", "/api/analytics/historical?period=7d", "/api/analytics/realtime"])
})
