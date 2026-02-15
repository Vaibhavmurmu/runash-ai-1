import Link from "next/link"
import { type ComponentType } from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AnalyticsSection,
  CheckoutLinksSection,
  CustomerPortalSection,
  PaymentMethodsSection,
  SubscriptionSection,
  TaxPayoutReportsSection,
  UsageBillingSection,
  type PaymentSectionKey,
} from "@/components/payment/unified-payment-sections"

type UnifiedPaymentPageProps = {
  title: string
  description: string
  sections?: PaymentSectionKey[]
}

const sectionRegistry: Record<PaymentSectionKey, ComponentType> = {
  methods: PaymentMethodsSection,
  checkoutLinks: CheckoutLinksSection,
  subscriptions: SubscriptionSection,
  analytics: AnalyticsSection,
  usage: UsageBillingSection,
  portal: CustomerPortalSection,
  reporting: TaxPayoutReportsSection,
}

const defaultSections: PaymentSectionKey[] = ["methods", "checkoutLinks", "subscriptions", "analytics", "usage", "portal", "reporting"]

export function UnifiedPaymentPage({ title, description, sections = defaultSections }: UnifiedPaymentPageProps) {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle className="text-3xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <nav aria-label="Payment route switcher" className="flex flex-wrap gap-2 text-sm">
            <Link className="rounded border px-3 py-1.5 hover:bg-muted" href="/payment/runash-pay">
              RunAsh Pay
            </Link>
            <Link className="rounded border px-3 py-1.5 hover:bg-muted" href="/payment/startup">
              Startup
            </Link>
            <Link className="rounded border px-3 py-1.5 hover:bg-muted" href="/payment/business">
              Business
            </Link>
          </nav>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sections.map((sectionKey) => {
          const SectionComponent = sectionRegistry[sectionKey]
          return <SectionComponent key={sectionKey} />
        })}
      </section>
    </div>
  )
}
