"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ConfirmSettingsActionDialog } from "@/components/settings/confirm-settings-action-dialog"
import {
  Crown,
  CreditCard,
  Calendar,
  Users,
  Download,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react"
import {
  SubscriptionService,
  type UserSubscription,
  type SubscriptionPlan,
  type Invoice,
} from "@/lib/subscription-service"
import { useToast } from "@/hooks/use-toast"

interface BillingLifecycleSnapshot {
  signupToCheckoutConversion: number
  failedPaymentRecoveryRate: number
  recoveryRate: number
  churnRate: number
  mrr: number
  arpu: number
  ltv: number | null
}

export function SubscriptionManager() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [usage, setUsage] = useState<{ [key: string]: number }>({})
  const [loading, setLoading] = useState(true)
  const [changingPlan, setChangingPlan] = useState(false)
  const [pendingPlanChange, setPendingPlanChange] = useState<SubscriptionPlan | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [lifecycle, setLifecycle] = useState<BillingLifecycleSnapshot | null>(null)

  const subscriptionService = SubscriptionService.getInstance()
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [userSub, allPlans, userInvoices, currentUsage, lifecycleResponse] = await Promise.all([
        subscriptionService.getUserSubscription(),
        subscriptionService.getPlans(),
        subscriptionService.getInvoices(5),
        subscriptionService.getUsage(),
        fetch("/api/payment/lifecycle", { cache: "no-store" }),
      ])

      const lifecyclePayload = lifecycleResponse.ok
        ? ((await lifecycleResponse.json()) as { data?: BillingLifecycleSnapshot })
        : null

      setSubscription(userSub)
      setPlans(allPlans)
      setInvoices(userInvoices.invoices)
      setUsage(currentUsage)
      setLifecycle(lifecyclePayload?.data ?? null)
    } catch (error) {
      console.error("Failed to load subscription data:", error)
      toast({
        title: "Error",
        description: "Failed to load subscription data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePlanChange = async (plan: SubscriptionPlan) => {
    if (!subscription) return

    try {
      setChangingPlan(true)
      await subscriptionService.updateSubscription(plan.id)
      await loadData()
      setPendingPlanChange(null)

      toast({
        title: "Plan Updated",
        description: `Successfully changed to ${plan.name}`,
      })
    } catch (error) {
      console.error("Failed to change plan:", error)
      toast({
        title: "Error",
        description: "Failed to change subscription plan",
        variant: "destructive",
      })
      throw new Error("Failed to change subscription plan")
    } finally {
      setChangingPlan(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!subscription) return

    try {
      await subscriptionService.cancelSubscription()
      await loadData()
      setShowCancelDialog(false)

      toast({
        title: "Subscription Canceled",
        description: "Your subscription will end at the current period",
      })
    } catch (error) {
      console.error("Failed to cancel subscription:", error)
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      })
      throw new Error("Failed to cancel subscription")
    } finally {
      // loading state handled by confirmation dialog
    }
  }

  const handleReactivateSubscription = async () => {
    if (!subscription) return

    try {
      await subscriptionService.reactivateSubscription()
      await loadData()

      toast({
        title: "Subscription Reactivated",
        description: "Your subscription has been reactivated",
      })
    } catch (error) {
      console.error("Failed to reactivate subscription:", error)
      toast({
        title: "Error",
        description: "Failed to reactivate subscription",
        variant: "destructive",
      })
    }
  }

  const openBillingPortal = async () => {
    try {
      const session = await subscriptionService.createBillingPortalSession(window.location.href)
      window.location.href = session.url
    } catch (error) {
      console.error("Failed to open billing portal:", error)
      toast({
        title: "Error",
        description: "Failed to open billing portal",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "trialing":
        return "bg-blue-100 text-blue-800"
      case "past_due":
        return "bg-yellow-100 text-yellow-800"
      case "canceled":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-red-100 text-red-800"
    }
  }

  const calculateUsagePercentage = (used: number, limit: number) => {
    return limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount)

  // Minimal handler to route to subscription page when no active subscription
  const handleGetStarted = () => {
    // Navigate to subscription route that mounts this manager with full plan list context
    window.location.href = "/payment/subscription"
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription & Billing</h1>
          <p className="text-muted-foreground">Manage your subscription and billing information</p>
        </div>
        <Button onClick={openBillingPortal} variant="outline">
          <ExternalLink className="h-4 w-4 mr-2" />
          Billing Portal
        </Button>
      </div>

      {lifecycle ? (
        <Card>
          <CardHeader>
            <CardTitle>Billing lifecycle insights</CardTitle>
            <CardDescription>MRR, ARPU, LTV, churn, recovery, and signup conversion snapshots.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded border p-3 text-sm">MRR: <span className="font-semibold">{formatCurrency(lifecycle.mrr)}</span></div>
            <div className="rounded border p-3 text-sm">ARPU: <span className="font-semibold">{formatCurrency(lifecycle.arpu)}</span></div>
            <div className="rounded border p-3 text-sm">LTV: <span className="font-semibold">{lifecycle.ltv === null ? "N/A" : formatCurrency(lifecycle.ltv)}</span></div>
            <div className="rounded border p-3 text-sm">Churn: <span className="font-semibold">{lifecycle.churnRate.toFixed(1)}%</span></div>
            <div className="rounded border p-3 text-sm">Recovery: <span className="font-semibold">{lifecycle.recoveryRate.toFixed(1)}%</span></div>
            <div className="rounded border p-3 text-sm">Signup → Checkout: <span className="font-semibold">{lifecycle.signupToCheckoutConversion.toFixed(1)}%</span></div>
          </CardContent>
        </Card>
      ) : null}

      {/* Current Subscription Status */}
      {subscription ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-orange-500" />
                <div>
                  <CardTitle>{subscription.plan.name}</CardTitle>
                  <CardDescription>
                    {subscriptionService.formatCurrency(subscription.plan.price, subscription.plan.currency)} /{" "}
                    {subscription.plan.interval}
                  </CardDescription>
                </div>
              </div>
              <Badge className={getStatusColor(subscription.status)}>{subscription.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Current Period</p>
                  <p className="font-medium">
                    {new Date(subscription.current_period_start).toLocaleDateString()} -{" "}
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {subscription.trial_end && new Date(subscription.trial_end) > new Date() && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Trial Ends</p>
                    <p className="font-medium text-blue-600">{new Date(subscription.trial_end).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Next Billing</p>
                  <p className="font-medium">{new Date(subscription.current_period_end).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {subscription.cancel_at_period_end && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Your subscription will end on {new Date(subscription.current_period_end).toLocaleDateString()}.{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={handleReactivateSubscription}>
                    Reactivate subscription
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPendingPlanChange(subscription.plan)}
                disabled={subscription.status !== "active"}
              >
                Change Plan
              </Button>
              {!subscription.cancel_at_period_end && (
                <Button variant="outline" onClick={() => setShowCancelDialog(true)}>
                  Cancel Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Crown className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Active Subscription</h3>
            <p className="text-muted-foreground mb-4">
              Choose a plan to unlock premium features and grow your audience.
            </p>
            {/* Wire button to navigate to subscription page */}
            <Button onClick={handleGetStarted} className="bg-gradient-to-r from-orange-500 to-amber-500">
              Choose a Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Usage Overview */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Usage Overview</CardTitle>
            <CardDescription>Your current usage for this billing period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Streams this month</span>
                  <span>
                    {usage.streams || 0} / {subscription.plan.limits.streams_per_month}
                  </span>
                </div>
                <Progress
                  value={calculateUsagePercentage(usage.streams || 0, subscription.plan.limits.streams_per_month)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Storage used</span>
                  <span>
                    {(usage.storage_gb || 0).toFixed(1)} GB / {subscription.plan.limits.storage_gb} GB
                  </span>
                </div>
                <Progress
                  value={calculateUsagePercentage(usage.storage_gb || 0, subscription.plan.limits.storage_gb)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for detailed information */}
      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plans">Available Plans</TabsTrigger>
          <TabsTrigger value="invoices">Billing History</TabsTrigger>
          <TabsTrigger value="usage">Usage Details</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.is_popular ? "border-orange-500" : ""}`}>
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-orange-500">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {subscription?.plan_id === plan.id && <Badge variant="secondary">Current</Badge>}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="text-3xl font-bold">
                    {subscriptionService.formatCurrency(plan.price, plan.currency)}
                    <span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={subscription?.plan_id === plan.id ? "outline" : "default"}
                    disabled={subscription?.plan_id === plan.id || changingPlan}
                    onClick={() => {
                      if (!subscription) {
                        return
                      }

                      const isDowngrade = plan.price < subscription.plan.price
                      if (isDowngrade) {
                        setPendingPlanChange(plan)
                        return
                      }

                      void handlePlanChange(plan)
                    }}
                  >
                    {subscription?.plan_id === plan.id
                      ? "Current Plan"
                      : subscription
                        ? "Switch to This Plan"
                        : "Get Started"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>Your recent invoices and payments</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            invoice.status === "paid"
                              ? "bg-green-500"
                              : invoice.status === "open"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                        />
                        <div>
                          <p className="font-medium">{invoice.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(invoice.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">
                            {subscriptionService.formatCurrency(invoice.amount_due, invoice.currency)}
                          </p>
                          <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>{invoice.status}</Badge>
                        </div>
                        {invoice.invoice_pdf && (
                          <Button variant="ghost" size="sm" onClick={() => window.open(invoice.invoice_pdf, "_blank")}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No invoices found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Usage</CardTitle>
              <CardDescription>Breakdown of your current usage and limits</CardDescription>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-4">
                      <h4 className="font-medium">Current Usage</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Streams</span>
                          <span className="font-medium">{usage.streams || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Storage</span>
                          <span className="font-medium">{(usage.storage_gb || 0).toFixed(1)} GB</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Multi-platform streams</span>
                          <span className="font-medium">{usage.multi_platform_streams || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium">Plan Limits</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Streams per month</span>
                          <span className="font-medium">{subscription.plan.limits.streams_per_month}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Storage</span>
                          <span className="font-medium">{subscription.plan.limits.storage_gb} GB</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Multi-platform streams</span>
                          <span className="font-medium">{subscription.plan.limits.multi_platform_streams}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Subscribe to a plan to track usage</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cancel Subscription Dialog */}
      <ConfirmSettingsActionDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel subscription?"
        description="This stops renewal at the end of your current billing period."
        consequence="You keep access until period end, then premium features are removed."
        confirmLabel="Cancel subscription"
        loadingLabel="Canceling subscription..."
        successMessage="Subscription cancellation scheduled for period end."
        onConfirm={handleCancelSubscription}
      />

      <ConfirmSettingsActionDialog
        open={Boolean(subscription && pendingPlanChange && pendingPlanChange.id !== subscription.plan.id)}
        onOpenChange={(open) => (!open ? setPendingPlanChange(null) : undefined)}
        title="Downgrade plan?"
        description="You are switching to a lower plan tier."
        consequence="Lower limits and removed features apply immediately after the plan change."
        irreversibleWarning="Downgrade effects can impact active workflows and may not be reversible for the current billing cycle."
        confirmLabel="Downgrade plan"
        loadingLabel="Applying downgrade..."
        successMessage="Plan change completed."
        onConfirm={async () => {
          if (!pendingPlanChange) {
            return
          }

          await handlePlanChange(pendingPlanChange)
        }}
      />
    </div>
  )
}
