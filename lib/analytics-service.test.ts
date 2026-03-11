import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import path from "node:path"
import test from "node:test"

import { AnalyticsService } from "@/lib/analytics-service"

type MockResponse = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
  blob?: () => Promise<Blob>
}

function createResponse(payload: unknown, ok = true, status = 200): MockResponse {
  return {
    ok,
    status,
    json: async () => payload,
  }
}

function assertHasKeys(value: unknown, keys: string[]) {
  assert.equal(typeof value, "object")
  assert.notEqual(value, null)
  for (const key of keys) {
    assert.equal(key in (value as Record<string, unknown>), true, `Missing key '${key}'`)
  }
}

test("analytics service methods map to existing route files", () => {
  const routeFiles = [
    "app/api/analytics/realtime/route.ts",
    "app/api/analytics/realtime/stream/route.ts",
    "app/api/analytics/historical/route.ts",
    "app/api/analytics/overview/route.ts",
    "app/api/analytics/platforms/route.ts",
    "app/api/analytics/audience/route.ts",
    "app/api/analytics/revenue/route.ts",
    "app/api/analytics/stream-health/[streamId]/route.ts",
    "app/api/analytics/compare/route.ts",
    "app/api/analytics/ai-insights/route.ts",
  ]

  for (const routeFile of routeFiles) {
    const fullPath = path.resolve(process.cwd(), routeFile)
    assert.equal(existsSync(fullPath), true, `Missing analytics route file: ${routeFile}`)
  }
})

test("getOverviewAnalytics uses overview endpoint and expected shape", async () => {
  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    assert.equal(String(input), "/api/analytics/overview?period=7d&streamId=stream_1")
    assert.equal(init?.credentials, "include")
    return createResponse({
      totalViews: 10,
      revenue: 5,
      avgWatchTimeSeconds: 60,
      engagementRate: 2,
      change: { views: 1, revenue: 1, watch: 1, engagement: 1 },
    }) as any
  }) as any

  const payload = await AnalyticsService.getInstance().getOverviewAnalytics("7d", "stream_1")
  assertHasKeys(payload, ["totalViews", "revenue", "avgWatchTimeSeconds", "engagementRate", "change"])
})

test("getHistoricalAnalytics uses historical endpoint and expected shape", async () => {
  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    assert.equal(String(input), "/api/analytics/historical?period=30d&streamId=stream_2")
    assert.equal(init?.credentials, "include")
    return createResponse({ viewerCounts: [], chatActivity: [], followerGrowth: [], revenue: [], engagement: [], watchTime: [] }) as any
  }) as any

  const payload = await AnalyticsService.getInstance().getHistoricalAnalytics("30d", "stream_2")
  assertHasKeys(payload, ["viewerCounts", "chatActivity", "followerGrowth", "revenue", "engagement", "watchTime"])
})

test("getRealTimeAnalytics uses realtime endpoint and expected shape", async () => {
  global.fetch = (async (input: string | URL | Request) => {
    assert.equal(String(input), "/api/analytics/realtime?streamId=stream_2")
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

  const payload = await AnalyticsService.getInstance().getRealTimeAnalytics("stream_2")
  assertHasKeys(payload, [
    "totalViews",
    "currentViewers",
    "peakViewers",
    "averageViewers",
    "watchTime",
    "chatMessages",
    "newFollowers",
    "donations",
    "engagement",
    "streamHealth",
    "revenue",
    "subscriptions",
  ])
})

test("platform/revenue/compare/stream-health service methods use supported endpoints", async () => {
  const calls: string[] = []
  global.fetch = (async (input: string | URL | Request) => {
    const url = String(input)
    calls.push(url)

    if (url.startsWith("/api/analytics/platforms")) {
      return createResponse({
        platforms: [
          {
            platform: "youtube",
            viewers: 10,
            chatMessages: 1,
            followers: 2,
            subscribers: 3,
            donations: 4,
            revenue: 5,
            engagement: 6,
            color: "#f97316",
          },
        ],
      }) as any
    }

    if (url.startsWith("/api/analytics/revenue")) {
      return createResponse({
        totalRevenue: 10,
        revenueBySource: [],
        revenueTimeline: [],
        topEarningStreams: [],
      }) as any
    }

    if (url.startsWith("/api/analytics/stream-health/")) {
      return createResponse({ bitrate: 1000, fps: 60, droppedFrames: 0, bandwidth: 10000, latency: 50, quality: "good", issues: [] }) as any
    }

    return createResponse({ streams: [], comparison: [] }) as any
  }) as any

  const service = AnalyticsService.getInstance()
  const [platforms, revenue, health, compare] = await Promise.all([
    service.getPlatformAnalytics("7d"),
    service.getRevenueAnalytics("7d"),
    service.getStreamHealth("stream_a"),
    service.getComparativeAnalytics(["stream_a"], "7d"),
  ])

  assert.equal(calls.includes("/api/analytics/platforms?period=7d"), true)
  assert.equal(calls.includes("/api/analytics/revenue?period=7d"), true)
  assert.equal(calls.includes("/api/analytics/stream-health/stream_a"), true)
  assert.equal(calls.includes("/api/analytics/compare"), true)

  assert.equal(Array.isArray(platforms), true)
  assertHasKeys(revenue, ["totalRevenue", "revenueBySource", "revenueTimeline", "topEarningStreams"])
  assertHasKeys(health, ["bitrate", "fps", "droppedFrames", "bandwidth", "latency", "quality", "issues"])
  assertHasKeys(compare, ["streams", "comparison"])
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


test("audience and ai-insights methods use supported endpoints", async () => {
  const calls: string[] = []
  global.fetch = (async (input: string | URL | Request) => {
    const url = String(input)
    calls.push(url)

    if (url.startsWith("/api/analytics/audience")) {
      return createResponse({ demographics: { ageGroups: [], genderDistribution: [], topCountries: [] }, deviceTypes: [], viewerRetention: [] }) as any
    }

    return createResponse({ insights: [], predictions: [] }) as any
  }) as any

  const service = AnalyticsService.getInstance()
  const [audience, insights] = await Promise.all([service.getAudienceAnalytics("7d", "stream_1"), service.getAIInsights("7d")])

  assert.equal(calls.includes("/api/analytics/audience?period=7d&streamId=stream_1"), true)
  assert.equal(calls.includes("/api/analytics/ai-insights?period=7d"), true)
  assertHasKeys(audience, ["demographics", "deviceTypes", "viewerRetention"])
  assertHasKeys(insights, ["insights", "predictions"])
})

test("exportAnalytics uses export endpoint", async () => {
  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    assert.equal(String(input), "/api/analytics/export?format=json&period=7d")
    assert.equal(init?.credentials, "include")
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      blob: async () => new Blob(["ok"], { type: "application/json" }),
    } as any
  }) as any

  const payload = await AnalyticsService.getInstance().exportAnalytics("json", "7d")
  assert.equal(payload instanceof Blob, true)
})
