import { NextResponse } from "next/server"

import {
  normalizeSubscriptionEmail,
  upsertSubscription,
  type UpsertSubscriptionResult,
} from "@/lib/repositories/subscriptions"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RATE_LIMIT_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_IP = 10
const MAX_REQUESTS_PER_EMAIL = 4

type RateLimitState = {
  count: number
  resetAt: number
}

type RateLimitMap = Map<string, RateLimitState>

type SubscribeDependencies = {
  upsert: (input: { email: string; metadata: Record<string, unknown> }) => Promise<UpsertSubscriptionResult>
  now: () => number
  ipLimits: RateLimitMap
  emailLimits: RateLimitMap
}

const ipLimits: RateLimitMap = new Map()
const emailLimits: RateLimitMap = new Map()

const defaultDependencies: SubscribeDependencies = {
  upsert: upsertSubscription,
  now: () => Date.now(),
  ipLimits,
  emailLimits,
}

function takeRateLimitToken(bucket: RateLimitMap, key: string, maxRequests: number, now: number): boolean {
  const current = bucket.get(key)
  if (!current || current.resetAt <= now) {
    bucket.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (current.count >= maxRequests) {
    return false
  }

  current.count += 1
  return true
}

function resolveClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (!forwardedFor) {
    return "unknown"
  }

  return forwardedFor.split(",")[0]?.trim() || "unknown"
}

function isSafeEmail(email: string): boolean {
  return email.length >= 3 && email.length <= 254 && EMAIL_REGEX.test(email)
}

export async function handleSubscribePostRequest(request: Request, deps: SubscribeDependencies = defaultDependencies) {
  const body = await request.json().catch(() => null)
  const email = normalizeSubscriptionEmail(body?.email)

  if (!isSafeEmail(email)) {
    return NextResponse.json({ ok: false, email: null, alreadySubscribed: false, error: "invalid_email" }, { status: 400 })
  }

  const now = deps.now()
  const ip = resolveClientIp(request)

  const allowedByIp = takeRateLimitToken(deps.ipLimits, ip, MAX_REQUESTS_PER_IP, now)
  const allowedByEmail = takeRateLimitToken(deps.emailLimits, email, MAX_REQUESTS_PER_EMAIL, now)

  if (!allowedByIp || !allowedByEmail) {
    return NextResponse.json({ ok: false, email, alreadySubscribed: false, error: "rate_limited" }, { status: 429 })
  }

  try {
    const result = await deps.upsert({
      email,
      metadata: {
        source: "api/subscribe",
        consentedAt: new Date(now).toISOString(),
        ip,
        userAgent: request.headers.get("user-agent"),
      },
    })

    return NextResponse.json(
      {
        ok: true,
        email: result.record.email,
        alreadySubscribed: !result.createdNew,
      },
      { status: result.createdNew ? 201 : 200 },
    )
  } catch {
    return NextResponse.json({ ok: false, email, alreadySubscribed: false, error: "storage_failure" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return handleSubscribePostRequest(request)
}
