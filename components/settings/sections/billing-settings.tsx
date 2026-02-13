import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SectionFeatureCard } from "@/components/settings/sections/section-feature-card"
import type { SettingsData, SettingsSection } from "@/components/settings/types"

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
  onSave: (section: SettingsSection) => void
  onAction: (action: "cancelSubscription" | "downgradePlan") => void
}

export function BillingSettings({ data, isDisabled, isSaving, errors, onFieldChange, onSave, onAction }: BillingSettingsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SectionFeatureCard
        panelId="upgrade"
        title="Upgrade"
        description="Move to a higher plan for more capacity and AI credits."
        status="Ready"
        actionLabel="View upgrade options"
        disabled={isDisabled}
        onAction={() => onSave("billing")}
      />
      <SectionFeatureCard
        panelId="subscription"
        title="Subscription"
        description="Control renewal and plan lifecycle."
        status="Configured"
        actionLabel="Cancel subscription"
        disabled={isDisabled}
        onAction={() => onAction("cancelSubscription")}
      />
      <SectionFeatureCard
        panelId="invoice"
        title="Invoice"
        description="Set where invoices are delivered."
        status="Configured"
        actionLabel={isSaving ? "Saving..." : "Save invoice settings"}
        disabled={isDisabled}
        onAction={() => onSave("billing")}
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
        panelId="billing-controls"
        title="Billing"
        description="Configure auto recharge behavior for uninterrupted service."
        status={data.billing.autoRechargeEnabled ? "Configured" : "Review"}
        actionLabel={isSaving ? "Saving..." : "Save billing settings"}
        disabled={isDisabled}
        onAction={() => onSave("billing")}
      >
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Auto recharge</p>
            <p className="text-xs text-muted-foreground">Automatically recharge balance when low.</p>
          </div>
          <Switch
            checked={data.billing.autoRechargeEnabled}
            onCheckedChange={(checked) => onFieldChange("billing", "autoRechargeEnabled", checked)}
            disabled={isDisabled}
          />
        </div>
      </SectionFeatureCard>
      <SectionFeatureCard
        panelId="usage"
        title="Usage"
        description="Track current cycle consumption and limits."
        status="Review"
        actionLabel="Refresh usage"
        disabled={isDisabled}
        onAction={() => onSave("billing")}
      />
      <SectionFeatureCard
        panelId="credits"
        title="Credits"
        description="Monitor available credits and top-up strategy."
        status="Recommended"
        actionLabel="Review credits"
        disabled={isDisabled}
        onAction={() => onSave("billing")}
      />
      <SectionFeatureCard
        panelId="referrals"
        title="Refer"
        description="Share referral links and track earned rewards."
        status="Ready"
        actionLabel="Downgrade plan"
        disabled={isDisabled}
        onAction={() => onAction("downgradePlan")}
      />
    </div>
  )
}
