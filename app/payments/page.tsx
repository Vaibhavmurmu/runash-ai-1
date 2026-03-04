import type { Metadata } from "next"
import { TopLevelModulePage } from "@/components/dashboard/top-level-module-page"

export const metadata: Metadata = {
  title: "Payments Module | RunAsh AI",
  description: "Top-level payments module for billing and payout operations.",
}

export default function PaymentsModulePage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <TopLevelModulePage
        title="Payments"
        summary="Review payment posture and open billing operations from a simplified entry point."
        ctaLabel="Open billing"
        ctaHref="/dashboard/billing"
        secondaryLinks={[
          { label: "Commerce payments", href: "/ecommerce/payments" },
          { label: "Legacy payment dashboard", href: "/payment/dashboard" },
        ]}
      />
    </div>
  )
}
