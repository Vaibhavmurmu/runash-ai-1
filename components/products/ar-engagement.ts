export type ArEngagementEventType =
  | "ar_cta_viewed"
  | "ar_cta_clicked"
  | "ar_launch_failed"
  | "ar_scale_changed"
  | "ar_reset"
  | "ar_fallback_used"

export async function trackArEngagement(input: {
  productId: string
  eventType: ArEngagementEventType
  metadata?: Record<string, unknown>
}) {
  try {
    await fetch("/api/analytics/ar-engagement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  } catch {
    // no-op: engagement tracking should never block product UX
  }
}

