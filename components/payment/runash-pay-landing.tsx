import Link from "next/link"
import { Banknote, BadgeCheck, Clock3, CreditCard, LockKeyhole, MousePointerClick, ShieldCheck, Wallet } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const valueBullets = [
  {
    title: "Fast by default",
    description: "Move from checkout intent to confirmation in a streamlined flow that keeps momentum high.",
    icon: Clock3,
  },
  {
    title: "Flexible for every model",
    description: "Support wallet balances, card spending, and payment links without forcing a one-size setup.",
    icon: Wallet,
  },
  {
    title: "Secure with guardrails",
    description: "Controls, alerts, and trusted verification help teams act quickly without losing confidence.",
    icon: ShieldCheck,
  },
  {
    title: "Built for broad acceptance",
    description: "Meet customers where they pay by combining familiar methods into one branded RunAsh experience.",
    icon: BadgeCheck,
  },
]

const setupSteps = [
  {
    title: "Create your RunAsh Wallet profile",
    description: "Set your payout destination, assign operating roles, and activate balance visibility in one place.",
  },
  {
    title: "Connect RunAsh Link for checkout",
    description: "Generate branded payment links and enable a one-click path for returning buyers.",
  },
  {
    title: "Launch with operational controls",
    description: "Use your dashboard to monitor transactions, approvals, and customer payment states in real time.",
  },
]

const spotlightSections = [
  {
    name: "RunAsh Card",
    description: "Reward loyal users while keeping finance controls close with spend limits and category preferences.",
    points: ["Rewards-ready card experiences", "Smart controls for limits and usage", "Visibility for every authorized transaction"],
    icon: CreditCard,
  },
  {
    name: "RunAsh Cash",
    description: "Transfer funds with clarity and keep spending flows smooth from incoming cash to outgoing actions.",
    points: ["Transfer flows designed for speed", "Clear movement history and status", "Spend orchestration for teams and users"],
    icon: Banknote,
  },
  {
    name: "RunAsh Link",
    description: "Turn checkout into a one-click experience with secure autofill and branded handoff moments.",
    points: ["One-click checkout moments", "Autofill that respects user control", "Higher conversion with trusted link journeys"],
    icon: MousePointerClick,
  },
]

const faqItems = [
  {
    id: "setup-time",
    question: "How quickly can a team start with RunAsh Pay?",
    answer:
      "Most teams can complete wallet setup, connect RunAsh Link, and begin accepting payments the same day after account verification.",
  },
  {
    id: "card-cash-link",
    question: "Do we need separate systems for Card, Cash, and Link?",
    answer:
      "No. RunAsh Card, RunAsh Cash, and RunAsh Link are built to work as one operating stack from the same payment dashboard.",
  },
  {
    id: "security-model",
    question: "How does RunAsh handle payment privacy and security?",
    answer:
      "RunAsh applies privacy-by-design practices and tokenized payment handling so sensitive payment details are not exposed to day-to-day operators.",
  },
  {
    id: "ops-visibility",
    question: "Can operations teams track payment activity in real time?",
    answer:
      "Yes. Payment states, recent actions, and operational controls are available in your RunAsh payment views for quick decision-making.",
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
            Pay the RunAsh way
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">One payment flow for growth, trust, and control.</h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            RunAsh Pay combines speed at checkout with operational clarity, so your team can move fast without trading away reliability.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/payment/startup">Get started</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/editor/docs">Explore docs</Link>
            </Button>
          </div>
        </div>

        <Card className="border-border/70 bg-muted/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">Operational confidence by default</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Monitor balances, requests, and transaction states from dedicated payment operations views while this page guides product discovery.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[
              "Live payment visibility",
              "Wallet, card, cash, and link support",
              "Fast operator handoff workflows",
              "Compatible with existing RunAsh payment paths",
            ].map((item) => (
              <div key={item} className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {valueBullets.map((bullet) => {
            const Icon = bullet.icon
            return (
              <Card key={bullet.title} className="border-border/70 shadow-sm">
                <CardHeader className="space-y-3">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <CardTitle className="text-lg">{bullet.title}</CardTitle>
                  <CardDescription>{bullet.description}</CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">It&apos;s ready and set</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            A guided setup flow for RunAsh Wallet + Link that gets your team from configuration to checkout readiness quickly.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {setupSteps.map((step, index) => (
            <Card key={step.title} className="border-border/70 shadow-sm">
              <CardHeader className="space-y-2">
                <Badge variant="secondary" className="w-fit rounded-full px-2 py-0.5 text-xs">
                  Step {index + 1}
                </Badge>
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Focused products, unified experience</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Spotlight capabilities for the three experiences teams use most to launch, optimize, and scale payment journeys.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {spotlightSections.map((section) => {
            const Icon = section.icon
            return (
              <Card key={section.name} className="border-border/70 shadow-sm">
                <CardHeader className="space-y-3">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <CardTitle className="text-xl">{section.name}</CardTitle>
                  <CardDescription className="leading-relaxed">{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {section.points.map((point) => (
                      <li key={point} className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <Card className="border-border/70 bg-muted/20 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-medium">Security</span>
            </div>
            <CardTitle className="text-2xl tracking-tight">Privacy-first payment architecture</CardTitle>
            <CardDescription className="max-w-3xl text-sm sm:text-base">
              RunAsh Pay is built with privacy-by-design principles and tokenized payment handling to reduce sensitive data exposure.
              Teams can manage flows, approvals, and statuses without direct access to raw payment credentials.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">FAQs</h2>
          <p className="text-sm text-muted-foreground sm:text-base">Answers to common questions as teams onboard to RunAsh Pay.</p>
        </div>
        <Accordion type="single" collapsible className="w-full rounded-md border px-4">
          {faqItems.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Ready to launch with RunAsh Pay?</h2>
            <p className="text-sm text-muted-foreground sm:text-base">Activate your payment stack, then scale with confidence from one operational surface.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/payment/startup">Get started</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/editor/docs">Explore docs</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
