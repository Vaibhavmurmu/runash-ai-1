import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

const plans = [
  {
    name: "Free Plan",
    status: "Active",
    description: "Limited streaming sessions and basic AI agent features",
    price: "$0",
    features: ["2 concurrent streams", "Basic AI agents", "Standard analytics", "Email support"],
    buttonText: "Current Plan",
    buttonVariant: "outline" as const,
  },
  {
    name: "Pro",
    status: null,
    description: "Extended streaming limits, advanced AI agents, priority support, and enhanced analytics",
    price: "$49",
    features: [
      "10 concurrent streams",
      "Advanced AI agents",
      "Real-time analytics",
      "Priority support",
      "Custom integrations",
    ],
    buttonText: "Upgrade to Pro",
    buttonVariant: "default" as const,
  },
  {
    name: "Ultra",
    status: null,
    description: "Unlimited streaming, enterprise AI features, dedicated support, and white-label options",
    price: "$149",
    features: [
      "Unlimited streams",
      "Enterprise AI agents",
      "Advanced analytics",
      "24/7 dedicated support",
      "White-label options",
      "API access",
    ],
    buttonText: "Upgrade to Ultra",
    buttonVariant: "secondary" as const,
  },
]

export function PricingPlans() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Plans</CardTitle>
        <CardDescription>Choose the plan that best fits your streaming and automation needs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className="border rounded-lg p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.status && <Badge variant="secondary">{plan.status}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                <div className="text-2xl font-bold">
                  {plan.price}
                  <span className="text-sm font-normal">/month</span>
                </div>
              </div>

              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button variant={plan.buttonVariant} className="w-full" disabled={plan.status === "Active"}>
                {plan.buttonText}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
