import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { createDashboardMetadata } from "../metadata"

const SellerWorkspace = dynamic(() => import("@/components/dashboard/workspace/seller-workspace").then((mod) => mod.SellerWorkspace), {
  loading: () => <Skeleton className="h-[560px] w-full" />,
})

export const metadata: Metadata = createDashboardMetadata({
  title: "Seller Studio",
  description: "Run seller operations, inventory workflows, and storefront tasks from the seller studio dashboard.",
  path: "/dashboard/seller-studio",
})

export default function DashboardSellerStudioPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
      <SellerWorkspace />
    </Suspense>
  )
}
