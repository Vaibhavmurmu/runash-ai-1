import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const productBlocks = [
  {
    name: "RunAsh Wallet",
    description:
      "Store and move balances instantly with a wallet built for subscriptions, top-ups, and daily checkout continuity.",
    highlights: ["Real-time balance visibility", "Fast top-up and payout controls", "Operational ledger-ready history"],
  },
  {
    name: "RunAsh Card",
    description:
      "Issue virtual and physical card experiences with tighter controls for limits, categories, and spend confidence.",
    highlights: ["Merchant and category controls", "Usage insights for finance teams", "Designed for secure recurring billing"],
  },
  {
    name: "RunAsh Cash",
    description:
      "Support quick in/out cash movement rails for settlements, reimbursements, and flexible business workflows.",
    highlights: ["Instant transfer initiation", "Faster settlement tracking", "Built for support-friendly resolution"],
  },
  {
    name: "RunAsh Link",
    description:
      "Share trusted payment links that keep conversion high while preserving the controls your teams need to operate safely.",
    highlights: ["Shareable checkout links", "Secure customer handoff", "Granular status monitoring"],
  },
]

export function RunAshPayLanding() {
  return (
    <main className="bg-background text-foreground">
      <section className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs tracking-wide">
              RunAsh Pay
            </Badge>
            <span className="text-sm text-muted-foreground">Unified payments</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/payment/dashboard">Payment Ops</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/payment/runash-pay/dashboard">Internal dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-20">
        <div className="space-y-6">
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
            Built for modern teams
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Pay, collect, and operate from one clean payment surface.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            RunAsh Pay brings consumer-grade simplicity to business-grade workflows, so teams can launch faster while keeping
            finance operations in control.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/payment/startup">Start with RunAsh Pay</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/payment/runash-pay/dashboard">Open operations dashboard</Link>
            </Button>
          </div>
        </div>

        <Card className="border-border/70 bg-muted/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">Operational confidence by default</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Monitor balance, transactions, and requests with a dedicated dashboard route while this page supports product discovery.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[
              "Real-time payment visibility",
              "Link, wallet, and card support",
              "Mobile-friendly payment actions",
              "Compatible with existing internal flows",
            ].map((item) => (
              <div key={item} className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Product blocks</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Four focused products that work together as a single RunAsh payment stack.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {productBlocks.map((product) => (
            <Card key={product.name} className="border-border/70 shadow-sm">
              <CardHeader className="space-y-2">
                <CardTitle className="text-xl">{product.name}</CardTitle>
                <CardDescription className="leading-relaxed">{product.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {product.highlights.map((highlight) => (
                    <li key={highlight} className="flex gap-2">
                      <span aria-hidden="true">•</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}
