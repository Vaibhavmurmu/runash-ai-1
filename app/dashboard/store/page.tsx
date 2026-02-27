import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { createDashboardMetadata } from "../metadata"

const StoreWorkspace = dynamic(() => import("@/components/dashboard/workspace/store-workspace").then((mod) => mod.StoreWorkspace), {
  loading: () => <Skeleton className="h-[560px] w-full" />,
})

export const metadata: Metadata = createDashboardMetadata({
  title: "Store Workspace",
  description: "Operate storefront assets, listings, and commerce workflows in the RunAsh dashboard store workspace.",
  path: "/dashboard/store",
})

export default function DashboardStorePage() {
  return (
    <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
      <StoreWorkspace />
    </Suspense>
  )
}
