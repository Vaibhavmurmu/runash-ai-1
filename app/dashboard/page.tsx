import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { createDashboardMetadata } from "./metadata"

const EnhancedDashboard = dynamic(() => import("@/components/dashboard/enhanced-dashboard").then((mod) => mod.EnhancedDashboard), {
  loading: () => <DashboardMainPanelSkeleton />,
})

const StreamQuickAccess = dynamic(() => import("@/components/dashboard/stream-quick-access").then((mod) => mod.StreamQuickAccess), {
  loading: () => <DashboardQuickAccessSkeleton />,
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
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  )
}

function DashboardQuickAccessSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-36" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto grid gap-6 p-4 md:p-6 lg:grid-cols-4 lg:p-8">
      <div className="lg:col-span-3">
        <Suspense fallback={<DashboardMainPanelSkeleton />}>
          <EnhancedDashboard />
        </Suspense>
      </div>
      <div>
        <Suspense fallback={<DashboardQuickAccessSkeleton />}>
          <StreamQuickAccess />
        </Suspense>
      </div>
    </div>
  )
}
