import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { createDashboardMetadata } from "../metadata"

const SettingsShell = dynamic(() => import("@/components/settings/settings-shell").then((mod) => mod.SettingsShell), {
  loading: () => <Skeleton className="h-[560px] w-full" />,
})

export const metadata: Metadata = createDashboardMetadata({
  title: "Settings",
  description: "Review and manage account-level dashboard preferences, security settings, and workspace controls.",
  path: "/dashboard/settings",
})

export default function DashboardSettingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
      <SettingsShell />
    </Suspense>
  )
}
