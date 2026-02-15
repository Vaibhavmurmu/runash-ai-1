import { UnifiedPaymentPage } from "@/components/payment/unified-payment-page"

export default function RunAshPayPage() {
  return (
    <UnifiedPaymentPage
      title="RunAsh Pay"
      description="Core payment command center for checkout links, payment methods, subscription posture, analytics, usage billing, and reports."
      sections={["methods", "checkoutLinks", "subscriptions", "analytics", "usage", "portal", "reporting"]}
    />
  )
}
