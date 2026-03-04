import { NextRequest } from "next/server"
import { queryOne, sql } from "@/lib/db"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { getServerAuthSession } from "@/lib/auth/session"

type AllowedEventType =
  | "ar_cta_viewed"
  | "ar_cta_clicked"
  | "ar_launch_failed"
  | "ar_scale_changed"
  | "ar_reset"
  | "ar_fallback_used"

const ALLOWED_EVENTS = new Set<AllowedEventType>([
  "ar_cta_viewed",
  "ar_cta_clicked",
  "ar_launch_failed",
  "ar_scale_changed",
  "ar_reset",
  "ar_fallback_used",
])

let tableReady = false

async function ensureArEngagementTable() {
  if (tableReady) return
  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS product_ar_engagement_events (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      product_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS product_ar_engagement_events_product_idx
      ON product_ar_engagement_events (product_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS product_ar_engagement_events_type_idx
      ON product_ar_engagement_events (event_type, created_at DESC);
  `)
  tableReady = true
}

export async function POST(request: NextRequest) {
  try {
    await ensureArEngagementTable()
    const session = await getServerAuthSession()
    const body = (await request.json()) as {
      productId?: string
      eventType?: AllowedEventType
      metadata?: Record<string, unknown>
    }

    if (!body.productId || !body.eventType || !ALLOWED_EVENTS.has(body.eventType)) {
      return respondError(
        request,
        { code: "INVALID_PAYLOAD", message: "productId and a supported eventType are required." },
        { status: 400 },
      )
    }

    const id = `ar_evt_${crypto.randomUUID()}`
    const inserted = await queryOne<{ id: string }>(
      `
        INSERT INTO product_ar_engagement_events (id, user_id, product_id, event_type, metadata)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING id
      `,
      [id, session?.user.id ?? null, body.productId, body.eventType, JSON.stringify(body.metadata ?? {})],
    )

    return respondSuccess(request, { id: inserted?.id ?? id }, { status: 201 })
  } catch {
    return respondError(
      request,
      { code: "AR_ENGAGEMENT_STORE_FAILED", message: "Unable to store AR engagement event." },
      { status: 500 },
    )
  }
}

