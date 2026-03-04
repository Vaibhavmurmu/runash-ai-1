import { UnifiedPaymentPage } from "@/components/payment/unified-payment-page"

export default function BusinessPaymentPage() {
  return (
    <UnifiedPaymentPage
      title="Business Payments"
      description="Business-grade workspace for payment rails, high-volume checkout links, analytics snapshots, and compliance reporting."
      sections={["methods", "checkoutLinks", "subscriptions", "analytics", "reporting", "portal"]}
    />
  )
}
