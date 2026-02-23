// Simple scheduling backed by Redis (fallback memory)
import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { getServerAuthSession } from "@/lib/auth/session"

type Schedule = { id: string; userId: string; title: string; startsAt: number; description?: string }

let _redis: Redis | null = null
function redis() {
  if (_redis) return _redis
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  _redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! })
  return _redis
}
const mem = new Map<string, Schedule[]>()

function key(userId: string) {
  return `schedule:${userId}`
}

function resolveScheduleUserId(sessionUserId?: string) {
  if (sessionUserId) return sessionUserId

  const isDevelopment = process.env.NODE_ENV === "development"
  const devFallbackEnabled = process.env.ENABLE_DEV_SCHEDULE_USER_FALLBACK === "true"
  const fallbackUserId = process.env.DEV_SCHEDULE_FALLBACK_USER_ID

  if (isDevelopment && devFallbackEnabled && fallbackUserId) {
    return fallbackUserId
  }

  return null
}

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession(req.headers)
  const userId = resolveScheduleUserId(session?.user?.id)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const r = redis()
  if (r) {
    const items = ((await r.get<Schedule[]>(key(userId))) as any) ?? []
    return NextResponse.json({ schedules: items })
  } else {
    return NextResponse.json({ schedules: mem.get(userId) ?? [] })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession(req.headers)
  const userId = resolveScheduleUserId(session?.user?.id)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.title || !body?.startsAt)
    return NextResponse.json({ error: "title and startsAt required" }, { status: 400 })

  const item: Schedule = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    title: body.title,
    startsAt: Number(body.startsAt),
    description: body.description,
  }

  const r = redis()
  if (r) {
    const items = ((await r.get<Schedule[]>(key(userId))) as any) ?? []
    items.push(item)
    await r.set(key(userId), items)
    return NextResponse.json({ schedule: item })
  } else {
    const arr = mem.get(userId) ?? []
    arr.push(item)
    mem.set(userId, arr)
    return NextResponse.json({ schedule: item })
  }
}

export const dynamic = "force-dynamic"
