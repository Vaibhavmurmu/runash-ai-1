import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PaymentDashboard } from "@/components/payment/payment-dashboard"
import { UsageBanner } from "@/components/billing/usage-banner"
import { Button } from "@/components/ui/button"

export default function PaymentDashboardPage() {
  return (
    <div className="container mx-auto py-8 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/payment/runash-pay">
            Open RunAsh Pay hub
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/payment/business">Business surface</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/payment/startup">Startup surface</Link>
        </Button>
      </div>

      <UsageBanner className="mb-6" plan="free" />
      <PaymentDashboard />
    </div>
  )
}
