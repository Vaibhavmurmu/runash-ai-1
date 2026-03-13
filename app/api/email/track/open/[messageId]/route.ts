import { type NextRequest, NextResponse } from "next/server"
import { EmailDeliveryTracker } from "@/lib/email-delivery"

export async function GET(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ messageId: string }> }) {
  const params = await routeParamsPromise
  try {
    const { messageId } = params
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Track the open event
    await EmailDeliveryTracker.trackEngagement(messageId, "open", {
      ip_address: ip,
      user_agent: userAgent,
      event_data: {
        timestamp: new Date().toISOString(),
        referer: request.headers.get("referer"),
      },
    })

    // Return a 1x1 transparent pixel
    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    )

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": pixel.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("Error tracking email open:", error)

    // Still return pixel even if tracking fails
    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    )

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": pixel.length.toString(),
      },
    })
  }
}
