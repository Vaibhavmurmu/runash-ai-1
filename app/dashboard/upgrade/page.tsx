import Link from "next/link"
import { ArrowUpRight, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const plans = [
  { name: "Starter", summary: "Best for individuals", cta: "Current plan" },
  { name: "Growth", summary: "For active creators and teams", cta: "Upgrade" },
  { name: "Business", summary: "Advanced automation and governance", cta: "Contact sales" },
]

export default function DashboardUpgradePage() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Upgrade & plan management</h1>
        <p className="text-sm text-muted-foreground">Discover plans and jump to billing controls.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-4 w-4 text-orange-500" />
                {plan.name}
              </CardTitle>
              <CardDescription>{plan.summary}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{plan.cta}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open billing workspace</CardTitle>
          <CardDescription>Use billing for invoice, subscription, and payment method operations.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/billing">
              Manage plans in billing
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
