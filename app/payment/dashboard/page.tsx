import Link from "next/link"
import { ArrowRight, BarChart3, Link2, Wallet } from "lucide-react"
import { PaymentDashboard } from "@/components/payment/payment-dashboard"
import { UsageBanner } from "@/components/billing/usage-banner"
import { Button } from "@/components/ui/button"

export default function PaymentDashboardPage() {
  return (
    <div id="analytics" className="container mx-auto py-8 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/payment/runash-pay">
            Open RunAsh Pay hub
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/ecommerce/payments">
            <Link2 className="h-4 w-4 mr-2" />
            Create payment link
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/payment/subscription">
            <Wallet className="h-4 w-4 mr-2" />
            Manage payout/subscription
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/payment/business">Business surface</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/payment/startup">Startup surface</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/payment/dashboard#analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            View analytics
          </Link>
        </Button>
      </div>

      <UsageBanner className="mb-6" plan="free" />
      <PaymentDashboard />
    </div>
  )
}
