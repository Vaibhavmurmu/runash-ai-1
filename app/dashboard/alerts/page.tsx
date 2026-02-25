import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { createDashboardMetadata } from "../metadata"

const AlertManager = dynamic(() => import("@/components/streaming/alerts/alert-manager"), {
  loading: () => <Skeleton className="h-[460px] w-full" />,
})

export const metadata: Metadata = createDashboardMetadata({
  title: "Alerts",
  description: "Configure stream alerts, moderation events, and notification behavior from the dashboard.",
  path: "/dashboard/alerts",
})

export default function DashboardAlertsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[460px] w-full" />}>
      <AlertManager />
    </Suspense>
  )
}
