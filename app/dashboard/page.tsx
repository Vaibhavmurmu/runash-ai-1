import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { createDashboardMetadata } from "./metadata"

const EnhancedDashboard = dynamic(() => import("@/components/dashboard/enhanced-dashboard").then((mod) => mod.EnhancedDashboard), {
  loading: () => <DashboardMainPanelSkeleton />,
})

export const metadata: Metadata = createDashboardMetadata({
  title: "Workspace",
  description:
    "Access your RunAsh AI workspace with dashboard insights and quick access links for core product surfaces.",
  path: "/dashboard",
})

function DashboardMainPanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Suspense fallback={<DashboardMainPanelSkeleton />}>
        <EnhancedDashboard />
      </Suspense>
    </div>
  )
}
