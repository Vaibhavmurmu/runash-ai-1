import { type NextRequest, NextResponse } from "next/server"
import { EmailDeliveryTracker } from "@/lib/email-delivery"

export async function GET(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ messageId: string }> }) {
  const params = await routeParamsPromise
  try {
    const { messageId } = params
    const { searchParams } = new URL(request.url)
    const originalUrl = searchParams.get("url")

    if (!originalUrl) {
      return NextResponse.json({ error: "Missing URL parameter" }, { status: 400 })
    }

    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Track the click event
    await EmailDeliveryTracker.trackEngagement(messageId, "click", {
      ip_address: ip,
      user_agent: userAgent,
      event_data: {
        clicked_url: originalUrl,
        timestamp: new Date().toISOString(),
        referer: request.headers.get("referer"),
      },
    })

    // Redirect to the original URL
    return NextResponse.redirect(decodeURIComponent(originalUrl))
  } catch (error) {
    console.error("Error tracking email click:", error)

    // Still redirect even if tracking fails
    const { searchParams } = new URL(request.url)
    const originalUrl = searchParams.get("url")

    if (originalUrl) {
      return NextResponse.redirect(decodeURIComponent(originalUrl))
    }

    return NextResponse.json({ error: "Tracking failed" }, { status: 500 })
  }
}
