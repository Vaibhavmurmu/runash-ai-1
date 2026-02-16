export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: "month" | "year"
  interval_count: number
  features: string[]
  limits: {
    streams_per_month: number
    storage_gb: number
    analytics_retention_days: number
    multi_platform_streams: number
    custom_branding: boolean
    priority_support: boolean
    api_access: boolean
  }
  stripe_price_id?: string
  is_popular: boolean
  is_active: boolean
  trial_days: number
  created_at: string
  updated_at: string
}

export interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  stripe_subscription_id?: string
  status: "active" | "canceled" | "past_due" | "unpaid" | "trialing" | "incomplete"
  current_period_start: string
  current_period_end: string
  trial_start?: string
  trial_end?: string
  cancel_at_period_end: boolean
  canceled_at?: string
  ended_at?: string
  created_at: string
  updated_at: string
  plan: SubscriptionPlan
}

export interface Invoice {
  id: string
  user_id: string
  subscription_id?: string
  stripe_invoice_id?: string
  amount_due: number
  amount_paid: number
  currency: string
  status: "draft" | "open" | "paid" | "void" | "uncollectible"
  description: string
  invoice_pdf?: string
  hosted_invoice_url?: string
  due_date: string
  paid_at?: string
  created_at: string
  line_items: InvoiceLineItem[]
}

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unit_amount: number
  amount: number
  period_start?: string
  period_end?: string
  proration: boolean
}

export interface UsageRecord {
  id: string
  user_id: string
  subscription_id: string
  metric: string
  quantity: number
  timestamp: string
  created_at: string
}

export interface BillingPortalSession {
  url: string
  return_url: string
}

type ApiEnvelope<T> = {
  success?: boolean
  data?: T
}

function unwrapEnvelope<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") return null
  const envelope = payload as ApiEnvelope<T>
  if ("data" in envelope) {
    return (envelope.data ?? null) as T | null
  }

  return payload as T
}

export class SubscriptionService {
  private static instance: SubscriptionService

  private constructor() {}

  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService()
    }
    return SubscriptionService.instance
  }

  // Subscription Plans
  public async getPlans(): Promise<SubscriptionPlan[]> {
    try {
      const response = await fetch("/api/billing/plans")
      if (!response.ok) throw new Error("Failed to fetch plans")
      const payload = await response.json()
      const parsed = unwrapEnvelope<{ plans?: SubscriptionPlan[] } | SubscriptionPlan[]>(payload)
      if (Array.isArray(parsed)) return parsed
      return parsed?.plans || []
    } catch (error) {
      console.error("Failed to fetch plans:", error)
      return []
    }
  }

  public async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    try {
      const response = await fetch(`/api/billing/plans/${planId}`)
      if (!response.ok) return null
      const payload = await response.json()
      const parsed = unwrapEnvelope<{ plan?: SubscriptionPlan } | SubscriptionPlan>(payload)
      if (!parsed) return null
      return (parsed as { plan?: SubscriptionPlan })?.plan || (parsed as SubscriptionPlan)
    } catch (error) {
      console.error("Failed to fetch plan:", error)
      return null
    }
  }

  // User Subscriptions
  public async getUserSubscription(): Promise<UserSubscription | null> {
    try {
      const response = await fetch("/api/billing/subscription")
      if (!response.ok) return null
      const payload = await response.json()
      const parsed = unwrapEnvelope<{ subscription?: UserSubscription } | UserSubscription>(payload)
      if (!parsed) return null
      return (parsed as { subscription?: UserSubscription })?.subscription ?? (parsed as UserSubscription)
    } catch (error) {
      console.error("Failed to fetch subscription:", error)
      return null
    }
  }

  public async createSubscription(
    planId: string,
    paymentMethodId?: string,
  ): Promise<{
    subscription: UserSubscription
    client_secret?: string
    requires_action?: boolean
  }> {
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId, payment_method_id: paymentMethodId }),
      })
      if (!response.ok) throw new Error("Failed to create subscription")
      const payload = await response.json()
      const parsed = unwrapEnvelope<{ subscription: UserSubscription; client_secret?: string; requires_action?: boolean }>(payload)
      if (!parsed?.subscription) throw new Error("Invalid create subscription response")
      return parsed
    } catch (error) {
      console.error("Failed to create subscription:", error)
      throw error
    }
  }

  public async updateSubscription(planId: string, prorate = true): Promise<UserSubscription> {
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId, prorate, confirm: true }),
      })
      if (!response.ok) throw new Error("Failed to update subscription")
      const payload = await response.json()
      const parsed = unwrapEnvelope<{ subscription?: UserSubscription } | UserSubscription>(payload)
      return ((parsed as { subscription?: UserSubscription })?.subscription || parsed) as UserSubscription
    } catch (error) {
      console.error("Failed to update subscription:", error)
      throw error
    }
  }

  public async cancelSubscription(immediately = false): Promise<UserSubscription> {
    try {
      const response = await fetch("/api/billing/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ immediately, confirm: true }),
      })
      if (!response.ok) throw new Error("Failed to cancel subscription")
      const payload = await response.json()
      const parsed = unwrapEnvelope<{ subscription?: UserSubscription } | UserSubscription>(payload)
      return ((parsed as { subscription?: UserSubscription })?.subscription || parsed) as UserSubscription
    } catch (error) {
      console.error("Failed to cancel subscription:", error)
      throw error
    }
  }

  public async reactivateSubscription(): Promise<UserSubscription> {
    try {
      const response = await fetch("/api/billing/subscription/reactivate", {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to reactivate subscription")
      const payload = await response.json()
      const parsed = unwrapEnvelope<{ subscription?: UserSubscription } | UserSubscription>(payload)
      return ((parsed as { subscription?: UserSubscription })?.subscription || parsed) as UserSubscription
    } catch (error) {
      console.error("Failed to reactivate subscription:", error)
      throw error
    }
  }

  // Invoices
  public async getInvoices(limit = 10, offset = 0): Promise<{ invoices: Invoice[]; total: number }> {
    try {
      const response = await fetch(`/api/billing/invoices?limit=${limit}&offset=${offset}`)
      if (!response.ok) throw new Error("Failed to fetch invoices")
      const payload = await response.json()
      const parsed = unwrapEnvelope<{ invoices?: Invoice[]; total?: number } | Invoice[]>(payload)
      if (Array.isArray(parsed)) {
        return { invoices: parsed, total: parsed.length }
      }
      return { invoices: parsed?.invoices || [], total: parsed?.total || 0 }
    } catch (error) {
      console.error("Failed to fetch invoices:", error)
      return { invoices: [], total: 0 }
    }
  }

  public async getInvoice(invoiceId: string): Promise<Invoice | null> {
    try {
      const response = await fetch(`/api/billing/invoices/${invoiceId}`)
      if (!response.ok) return null
      const payload = await response.json()
      const parsed = unwrapEnvelope<{ invoice?: Invoice } | Invoice>(payload)
      if (!parsed) return null
      return (parsed as { invoice?: Invoice })?.invoice || (parsed as Invoice)
    } catch (error) {
      console.error("Failed to fetch invoice:", error)
      return null
    }
  }

  public async downloadInvoice(invoiceId: string): Promise<Blob> {
    try {
      const response = await fetch(`/api/billing/invoices/${invoiceId}/download`)
      if (!response.ok) throw new Error("Failed to download invoice")
      return await response.blob()
    } catch (error) {
      console.error("Failed to download invoice:", error)
      throw error
    }
  }

  // Usage Tracking
  public async recordUsage(metric: string, quantity: number): Promise<void> {
    try {
      await fetch("/api/billing/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric, quantity }),
      })
    } catch (error) {
      console.error("Failed to record usage:", error)
    }
  }

  public async getUsage(period = "current"): Promise<{ [metric: string]: number }> {
    try {
      const response = await fetch(`/api/billing/usage?period=${period}`)
      if (!response.ok) throw new Error("Failed to fetch usage")
      return await response.json()
    } catch (error) {
      console.error("Failed to fetch usage:", error)
      return {}
    }
  }

  // Payment Methods
  public async getPaymentMethods(): Promise<any[]> {
    try {
      const response = await fetch("/api/billing/payment-methods")
      if (!response.ok) throw new Error("Failed to fetch payment methods")
      const { payment_methods } = await response.json()
      return payment_methods
    } catch (error) {
      console.error("Failed to fetch payment methods:", error)
      return []
    }
  }

  public async addPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      const response = await fetch("/api/billing/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_method_id: paymentMethodId }),
      })
      if (!response.ok) throw new Error("Failed to add payment method")
    } catch (error) {
      console.error("Failed to add payment method:", error)
      throw error
    }
  }

  public async setDefaultPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      const response = await fetch("/api/billing/payment-methods/default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_method_id: paymentMethodId }),
      })
      if (!response.ok) throw new Error("Failed to set default payment method")
    } catch (error) {
      console.error("Failed to set default payment method:", error)
      throw error
    }
  }

  public async removePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      const response = await fetch(`/api/billing/payment-methods/${paymentMethodId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to remove payment method")
    } catch (error) {
      console.error("Failed to remove payment method:", error)
      throw error
    }
  }

  // Billing Portal
  public async createBillingPortalSession(returnUrl?: string): Promise<BillingPortalSession> {
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ return_url: returnUrl }),
      })
      if (!response.ok) throw new Error("Failed to create billing portal session")
      const payload = await response.json()
      const parsed = unwrapEnvelope<BillingPortalSession>(payload)
      if (!parsed) throw new Error("Invalid billing portal response")
      return parsed
    } catch (error) {
      console.error("Failed to create billing portal session:", error)
      throw error
    }
  }

  // Pricing Calculations
  public calculateProration(
    currentPlan: SubscriptionPlan,
    newPlan: SubscriptionPlan,
    periodStart: Date,
    periodEnd: Date,
  ): { credit: number; charge: number; net: number } {
    const now = new Date()
    const totalPeriodDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
    const remainingDays = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    const currentDailyRate = currentPlan.price / totalPeriodDays
    const newDailyRate = newPlan.price / totalPeriodDays

    const credit = currentDailyRate * remainingDays
    const charge = newDailyRate * remainingDays
    const net = charge - credit

    return { credit, charge, net }
  }

  public formatCurrency(amount: number, currency = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount / 100) // Stripe amounts are in cents
  }
}
