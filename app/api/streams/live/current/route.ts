import { type NextRequest, NextResponse } from "next/server"
import { groceryProducts } from "@/lib/grocery-products"

const STREAM_ID = "grocery-live-1"
const FOLLOW_COOKIE_KEY = "runash-live-follow"

export async function GET(request: NextRequest) {
  const featuredProducts = groceryProducts.slice(0, 6).map((product) => product.id)
  const isFollowing = request.cookies.get(FOLLOW_COOKIE_KEY)?.value === STREAM_ID

  return NextResponse.json({
    stream: {
      id: STREAM_ID,
      title: "Fresh Organic Produce Showcase - Farm to Table",
      description:
        "Join us for an exclusive look at this week's freshest organic produce directly from partner farms, with live deals and host Q&A.",
      hostId: "host-1",
      hostName: "Sarah Chen",
      hostAvatar: "/placeholder.svg?height=100&width=100",
      status: "live",
      startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      viewerCount: 1247,
      maxViewers: 1580,
      category: "Organic Produce",
      tags: ["organic", "fresh", "seasonal", "farm-direct"],
      thumbnailUrl: "/placeholder.svg?height=400&width=600",
      streamUrl: "https://example.com/stream",
      featuredProducts,
      totalSales: 89,
      totalRevenue: 2847.5,
    },
    stats: {
      streamId: STREAM_ID,
      viewerCount: 1247,
      peakViewers: 1580,
      totalViews: 3420,
      chatMessages: 892,
      purchases: 89,
      revenue: 2847.5,
      averageWatchTime: 18.5,
      engagementRate: 0.72,
    },
    follow: {
      isFollowing,
    },
  })
}
