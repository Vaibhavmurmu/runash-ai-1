import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { createDashboardMetadata } from "../metadata"

const UnifiedPaymentPage = dynamic(
  () => import("@/components/payment/unified-payment-page").then((mod) => mod.UnifiedPaymentPage),
  {
    loading: () => <Skeleton className="h-[560px] w-full" />,
  },
)

export const metadata: Metadata = createDashboardMetadata({
  title: "Billing & Payments",
  description: "Manage subscriptions, invoices, and payment methods from the RunAsh AI dashboard billing center.",
  path: "/dashboard/billing",
})

export default function DashboardBillingPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
      <UnifiedPaymentPage
        title="Billing & Payments"
        description="Manage payment methods, subscriptions, invoices, portal access, and reporting from one dashboard module."
      />
    </Suspense>
  )
}
