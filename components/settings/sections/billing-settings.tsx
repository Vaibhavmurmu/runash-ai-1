import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SectionFeatureCard } from "@/components/settings/sections/section-feature-card"
import { SettingsRow, type SettingsStatus } from "@/components/settings/sections/settings-presentation"
import type { SettingsData, SettingsSection } from "@/components/settings/types"

type BillingAction =
  | "upgradePlan"
  | "manageSubscription"
  | "saveInvoiceDelivery"
  | "billingMethodSummary"
  | "usageMeters"
  | "creditsBalance"
  | "referAndEarn"

interface BillingSettingsProps {
  data: SettingsData
  isDisabled: boolean
  isSaving: boolean
  errors: Partial<Record<SettingsSection, string>>
  onFieldChange: <TSection extends SettingsSection, TField extends keyof SettingsData[TSection]>(
    section: TSection,
    field: TField,
    value: SettingsData[TSection][TField]
  ) => void
  onAction: (action: BillingAction) => void
}

const statusLabelMap: Record<SettingsData["billing"]["subscriptionStatus"], SettingsStatus> = {
  active: "active",
  trial: "trial",
  at_risk: "atRisk",
  past_due: "pastDue",
}

export function BillingSettings({ data, isDisabled, isSaving, errors, onFieldChange, onAction }: BillingSettingsProps) {
  const usageRemaining = Math.max(data.billing.usageLimit - data.billing.usageThisCycle, 0)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SectionFeatureCard
        panelId="upgrade"
        title="Upgrade"
        description="Read-only contract: current plan and trial status before upgrade changes."
        status="trial"
        actionLabel="Upgrade plan"
        disabled={isDisabled}
        onAction={() => onAction("upgradePlan")}
      >
        <p className="text-sm text-muted-foreground">Current plan: {data.billing.planName || "Starter"}</p>
      </SectionFeatureCard>

      <SectionFeatureCard
        panelId="subscription"
        title="Subscription"
        description="Read-only contract status and lifecycle signals."
        status={statusLabelMap[data.billing.subscriptionStatus]}
        actionLabel="Manage subscription"
        disabled={isDisabled}
        onAction={() => onAction("manageSubscription")}
      >
        <p className="text-sm text-muted-foreground">Status key: {data.billing.subscriptionStatus}</p>
      </SectionFeatureCard>

      <SectionFeatureCard
        panelId="invoice-delivery"
        title="Invoice delivery"
        description="Set where invoices are delivered. Existing keys remain unchanged."
        status="active"
        actionLabel={isSaving ? "Saving..." : "Save invoice delivery"}
        disabled={isDisabled}
        onAction={() => onAction("saveInvoiceDelivery")}
      >
        <div className="grid gap-2">
          <Label htmlFor="settings-invoice-email">Invoice email</Label>
          <Input
            id="settings-invoice-email"
            type="email"
            value={data.billing.invoiceEmail}
            onChange={(event) => onFieldChange("billing", "invoiceEmail", event.target.value)}
            disabled={isDisabled}
          />
        </div>
        {errors.billing ? <p className="text-sm text-destructive">{errors.billing}</p> : null}
      </SectionFeatureCard>

      <SectionFeatureCard
        panelId="billing-method"
        title="Billing method summary"
        description="Read-only payment method summary with safe defaults."
        status="atRisk"
        actionLabel="Review billing method"
        disabled={isDisabled}
        onAction={() => onAction("billingMethodSummary")}
      >
        <p className="text-sm text-muted-foreground">{data.billing.billingMethodSummary || "No default payment method on file."}</p>
      </SectionFeatureCard>

      <SectionFeatureCard
        panelId="usage-meters"
        title="Usage meters"
        description="Contract usage values before any mutating operations."
        status="active"
        actionLabel="Refresh usage"
        disabled={isDisabled}
        onAction={() => onAction("usageMeters")}
      >
        <p className="text-sm text-muted-foreground">
          {data.billing.usageThisCycle} / {data.billing.usageLimit} used ({usageRemaining} remaining)
        </p>
      </SectionFeatureCard>

      <SectionFeatureCard
        panelId="credits-balance"
        title="Credits balance"
        description="Available credit balance (read-only contract snapshot)."
        status="credits"
        actionLabel="Refresh credits"
        disabled={isDisabled}
        onAction={() => onAction("creditsBalance")}
      >
        <SettingsRow title="Auto recharge" description="Automatically recharge balance when low.">
          <Switch
            checked={data.billing.autoRechargeEnabled}
            onCheckedChange={(checked) => onFieldChange("billing", "autoRechargeEnabled", checked)}
            disabled={isDisabled}
          />
        </SettingsRow>
        <p className="text-sm text-muted-foreground">Balance: {data.billing.creditsBalance}</p>
      </SectionFeatureCard>

      <SectionFeatureCard
        panelId="refer-earn"
        title="Refer & earn"
        description="Share referral code and monitor earned rewards."
        status="pastDue"
        actionLabel="Open referral details"
        disabled={isDisabled}
        onAction={() => onAction("referAndEarn")}
      >
        <p className="text-sm text-muted-foreground">Referral code: {data.billing.referralCode || "Not generated"}</p>
      </SectionFeatureCard>
    </div>
  )
}
