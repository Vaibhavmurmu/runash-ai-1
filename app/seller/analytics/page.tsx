import type { Metadata } from "next"
import { TopLevelModulePage } from "@/components/dashboard/top-level-module-page"
import { createDashboardMetadata } from "@/app/dashboard/metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Seller Analytics",
  description: "Review seller performance trends, conversion signals, and channel health from a dedicated analytics module.",
  path: "/seller/analytics",
})

export default function SellerAnalyticsPage() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <TopLevelModulePage
        title="Seller Analytics"
        summary="Track storefront performance, live-session conversion impact, and revenue quality signals in one place."
        ctaLabel="Open stream analytics"
        ctaHref="/analytics/streams"
        secondaryLinks={[
          { label: "Dashboard analytics", href: "/dashboard/analytics" },
          { label: "Seller studio", href: "/dashboard/seller-studio" },
          { label: "Store workspace", href: "/dashboard/store" },
          { label: "Billing", href: "/dashboard/billing" },
        ]}
      />
    </div>
  )
}
