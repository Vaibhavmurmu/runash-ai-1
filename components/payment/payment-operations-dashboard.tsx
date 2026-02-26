"use client"

import { ActivitySquare, AlertTriangle, BadgeIndianRupee, BellRing, CheckCircle2, Clock3, RefreshCcw, ShieldAlert, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type TransactionStatus = "succeeded" | "pending" | "failed" | "refunded"

type Transaction = {
  id: string
  customer: string
  amount: number
  status: TransactionStatus
  createdAt: string
}

type PendingAction = {
  id: string
  title: string
  owner: string
  dueIn: string
  severity: "low" | "medium" | "high"
}

type FailureAlert = {
  id: string
  merchant: string
  reason: string
  failures: number
  lastSeen: string
}

const currentPlan = {
  name: "Business Plus",
  renewalDate: "12 Mar 2026",
  balance: 348930,
  creditLimit: 500000,
}

const recentTransactions: Transaction[] = [
  { id: "txn_92019", customer: "Ravi Kumar", amount: 12500, status: "succeeded", createdAt: "2m ago" },
  { id: "txn_92018", customer: "Aurora Foods", amount: 49800, status: "pending", createdAt: "8m ago" },
  { id: "txn_92017", customer: "Nexa Labs", amount: 7800, status: "failed", createdAt: "15m ago" },
  { id: "txn_92015", customer: "Mina Patel", amount: 2200, status: "refunded", createdAt: "34m ago" },
]

const pendingActions: PendingAction[] = [
  { id: "act_101", title: "Verify UPI payout account", owner: "Finance ops", dueIn: "4h", severity: "high" },
  { id: "act_102", title: "Confirm tax invoice batch", owner: "Billing", dueIn: "Today", severity: "medium" },
  { id: "act_103", title: "Retry failed mandate charge", owner: "Collections", dueIn: "1d", severity: "high" },
]

const failedRecovery = {
  openFailures: 17,
  autoRecovered: 9,
  manualInterventions: 4,
  recoveryRate: 64,
}

const failureAlerts: FailureAlert[] = [
  { id: "f_31", merchant: "GreenCart", reason: "3DS timeout", failures: 6, lastSeen: "6m ago" },
  { id: "f_29", merchant: "Indigo Print", reason: "Insufficient funds", failures: 4, lastSeen: "14m ago" },
  { id: "f_26", merchant: "Orbit Logistics", reason: "Card expired", failures: 3, lastSeen: "22m ago" },
]

const webhookHealth = {
  lagSecondsP95: 42,
  failedDeliveries: 12,
  replaysQueued: 7,
}

const riskFlags = {
  refundsInReview: 5,
  chargebacksOpen: 2,
  highRiskAccounts: 3,
}

const reconciliation = {
  matched: 1240,
  unmatched: 21,
  staleSettlements: 6,
  healthScore: 92,
}

const linkFunnelHealth = {
  sessionsCreated: 182,
  sessionsVerified: 164,
  autofillSuccess: 151,
  checkoutCompletion: 142,
  fallbackUsage: 19,
  errorRatePercent: 7.6,
}


const severityVariant = {
  low: "secondary",
  medium: "outline",
  high: "destructive",
} as const

const statusVariant = {
  succeeded: "default",
  pending: "secondary",
  failed: "destructive",
  refunded: "outline",
} as const

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

export function PaymentOperationsDashboard() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Payment Dashboard</h1>
          <p className="text-sm text-muted-foreground">Customer billing visibility + operator reliability controls.</p>
        </div>
        <Button variant="outline">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh snapshot
        </Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5" /> Current balance & plan
            </CardTitle>
            <CardDescription>{currentPlan.name} • Renews on {currentPlan.renewalDate}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Available balance</p>
                <p className="text-3xl font-bold">{formatCurrency(currentPlan.balance)}</p>
              </div>
              <Badge variant="secondary">Credit limit {formatCurrency(currentPlan.creditLimit)}</Badge>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                <span>Balance utilization</span>
                <span>{Math.round((currentPlan.balance / currentPlan.creditLimit) * 100)}%</span>
              </div>
              <Progress value={(currentPlan.balance / currentPlan.creditLimit) * 100} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5" /> Failed payment recovery
            </CardTitle>
            <CardDescription>Autopilot retries and manual rescue queue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Open failures</span><strong>{failedRecovery.openFailures}</strong></div>
            <div className="flex justify-between"><span>Auto recovered</span><strong>{failedRecovery.autoRecovered}</strong></div>
            <div className="flex justify-between"><span>Manual interventions</span><strong>{failedRecovery.manualInterventions}</strong></div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Recovery rate</span>
                <span>{failedRecovery.recoveryRate}%</span>
              </div>
              <Progress value={failedRecovery.recoveryRate} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent transactions</CardTitle>
            <CardDescription>Latest payment attempts across all channels.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.map((tx) => (
              <article key={tx.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">{tx.customer}</p>
                  <p className="text-xs text-muted-foreground">{tx.id} • {tx.createdAt}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(tx.amount)}</p>
                  <Badge variant={statusVariant[tx.status]} className="mt-1 capitalize">{tx.status}</Badge>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending actions</CardTitle>
            <CardDescription>Tasks that need operator or finance follow-up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingActions.map((action) => (
              <article key={action.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{action.title}</p>
                  <Badge variant={severityVariant[action.severity]} className="capitalize">{action.severity}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Owner: {action.owner} • Due: {action.dueIn}</p>
              </article>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Operator panel</h2>
          <p className="text-sm text-muted-foreground">Reliability and risk controls for payment operations teams.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><BellRing className="h-5 w-5" />Recent failures</CardTitle>
              <CardDescription>Escalate failure clusters before retry windows expire.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {failureAlerts.map((failure) => (
                <div key={failure.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{failure.merchant}</p>
                    <Badge variant="destructive">{failure.failures} fails</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{failure.reason} • Last seen {failure.lastSeen}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Clock3 className="h-5 w-5" />Webhook lag & errors</CardTitle>
              <CardDescription>Delivery latency and replay backlog across processors.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">P95 lag</p>
                <p className="text-xl font-semibold">{webhookHealth.lagSecondsP95}s</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Failed deliveries</p>
                <p className="text-xl font-semibold">{webhookHealth.failedDeliveries}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Replays queued</p>
                <p className="text-xl font-semibold">{webhookHealth.replaysQueued}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><ShieldAlert className="h-5 w-5" />Refund/chargeback flags</CardTitle>
              <CardDescription>Dispute risk and refund outlier watchlist.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Refunds in review</p>
                <p className="text-xl font-semibold">{riskFlags.refundsInReview}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Open chargebacks</p>
                <p className="text-xl font-semibold">{riskFlags.chargebacksOpen}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">High-risk accounts</p>
                <p className="text-xl font-semibold">{riskFlags.highRiskAccounts}</p>
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><ActivitySquare className="h-5 w-5" />Link funnel health</CardTitle>
              <CardDescription>Session→verification→checkout conversion for Instant Checkout.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Sessions created</p>
                <p className="text-xl font-semibold">{linkFunnelHealth.sessionsCreated}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Verified sessions</p>
                <p className="text-xl font-semibold">{linkFunnelHealth.sessionsVerified}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Checkout completed</p>
                <p className="text-xl font-semibold">{linkFunnelHealth.checkoutCompletion}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Autofill success</p>
                <p className="text-xl font-semibold">{linkFunnelHealth.autofillSuccess}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Fallback used</p>
                <p className="text-xl font-semibold">{linkFunnelHealth.fallbackUsage}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Error-rate alert</p>
                <p className="text-xl font-semibold">{linkFunnelHealth.errorRatePercent}%</p>
                <Badge variant={linkFunnelHealth.errorRatePercent >= 10 ? "destructive" : "secondary"} className="mt-2">
                  {linkFunnelHealth.errorRatePercent >= 20 ? "Critical" : linkFunnelHealth.errorRatePercent >= 10 ? "Warning" : "Healthy"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="h-5 w-5" />Reconciliation health</CardTitle>
              <CardDescription>Settlement matching and ledger confidence indicators.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between rounded-lg border p-3"><span>Matched entries</span><strong>{reconciliation.matched}</strong></div>
              <div className="flex justify-between rounded-lg border p-3"><span>Unmatched entries</span><strong>{reconciliation.unmatched}</strong></div>
              <div className="flex justify-between rounded-lg border p-3"><span>Stale settlements</span><strong>{reconciliation.staleSettlements}</strong></div>
              <div className="rounded-lg border p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><BadgeIndianRupee className="h-3 w-3" />Health score</span>
                  <span>{reconciliation.healthScore}%</span>
                </div>
                <Progress value={reconciliation.healthScore} />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
