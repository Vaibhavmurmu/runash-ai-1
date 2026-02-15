import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CheckoutLinksSection,
  CustomerPortalSection,
  PaymentMethodsSection,
  TaxPayoutReportsSection,
  UsageBillingSection,
} from "@/components/payment/unified-payment-sections"

type UnifiedPaymentPageProps = {
  title: string
  description: string
}

export function UnifiedPaymentPage({ title, description }: UnifiedPaymentPageProps) {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PaymentMethodsSection />
        <CheckoutLinksSection />
        <UsageBillingSection />
        <CustomerPortalSection />
        <TaxPayoutReportsSection />
      </section>
    </div>
  )
}
