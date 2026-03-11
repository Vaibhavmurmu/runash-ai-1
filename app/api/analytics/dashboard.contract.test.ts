import assert from "node:assert/strict"
import test from "node:test"

import { getDashboardDataFromSql } from "@/lib/services/analytics-dashboard"

type SqlFixture = Record<string, unknown>[]

function createFixtureSql(fixtures: Record<string, SqlFixture>) {
  return (async (strings: TemplateStringsArray) => {
    const query = strings.join(" ").replace(/\s+/g, " ").trim().toLowerCase()

    if (query.includes("to_char(date_trunc('month', sa.created_at), 'mon')")) {
      return fixtures.overview ?? []
    }

    if (query.includes("coalesce(nullif(trim(s.platform), ''), 'unknown')::text as name")) {
      return fixtures.platforms ?? []
    }

    if (query.includes("coalesce(nullif(trim(s.title), ''), 'untitled stream')::text as name")) {
      return fixtures.content ?? []
    }

    if (query.includes("from public.payment_transactions pt")) {
      return fixtures.revenue ?? []
    }

    if (query.includes("to_char(date_trunc('hour', sa.created_at), 'hh24:00')")) {
      return fixtures.engagement ?? []
    }

    return []
  }) as any
}

test("dashboard analytics contract is deterministic for fixed SQL fixtures", async () => {
  const fixtureSql = createFixtureSql({
    overview: [
      { month: "Jan", viewers: 100, followers: 10, revenue: 20 },
      { month: "Feb", viewers: 110, followers: 11, revenue: 25 },
    ],
    platforms: [
      { name: "Twitch", value: 60 },
      { name: "YouTube", value: 40 },
    ],
    content: [{ name: "Launch Stream", views: 88, engagement: 4.5 }],
    revenue: [
      { name: "succeeded", value: 30 },
      { name: "pending", value: 5 },
    ],
    engagement: [
      { hour_label: "10:00", chat_activity: 5, viewers: 50 },
      { hour_label: "11:00", chat_activity: 7, viewers: 65 },
    ],
  })

  const first = await getDashboardDataFromSql({ userId: "user_1", sqlClient: fixtureSql })
  const second = await getDashboardDataFromSql({ userId: "user_1", sqlClient: fixtureSql })

  assert.deepEqual(first, second)
  assert.deepEqual(first.overview, [
    { date: "Feb", viewers: 110, followers: 11, revenue: 25 },
    { date: "Jan", viewers: 100, followers: 10, revenue: 20 },
  ])
  assert.deepEqual(first.platforms, [
    { name: "Twitch", value: 60, color: "#9146FF" },
    { name: "YouTube", value: 40, color: "#FF0000" },
  ])
  assert.equal(first.audience.length, 0)
})
