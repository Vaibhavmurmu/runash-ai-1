import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { createDashboardMetadata } from "../metadata"

const EnhancedStreamingStudio = dynamic(
  () => import("@/components/streaming/enhanced-streaming-studio").then((mod) => mod.EnhancedStreamingStudio),
  {
    loading: () => <Skeleton className="h-[560px] w-full" />,
  },
)

export const metadata: Metadata = createDashboardMetadata({
  title: "Streaming Studio",
  description: "Monitor live stream operations, controls, and analytics from the RunAsh streaming studio.",
  path: "/dashboard/streaming-studio",
})

export default function DashboardStreamingStudioPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
      <EnhancedStreamingStudio />
    </Suspense>
  )
}
