import { UnifiedPaymentPage } from "@/components/payment/unified-payment-page"

export default function StartupPaymentPage() {
  return (
    <UnifiedPaymentPage
      title="Startup Payments"
      description="Startup-focused setup with fast payment method checks, launch-ready checkout links, subscription visibility, and usage controls."
      sections={["methods", "checkoutLinks", "subscriptions", "usage", "portal"]}
    />
  )
}
