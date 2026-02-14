import { BillingSettings } from "@/components/settings/sections/billing-settings"
import type { FieldChangeHandler, SettingsSectionErrors } from "@/components/settings/sections/section-panel-types"

interface BillingSectionPanelProps {
  data: Parameters<typeof BillingSettings>[0]["data"]
  isDisabled: boolean
  isSaving: boolean
  errors: SettingsSectionErrors
  onFieldChange: FieldChangeHandler
  onAction: Parameters<typeof BillingSettings>[0]["onAction"]
}

export function BillingSectionPanel(props: BillingSectionPanelProps) {
  return <BillingSettings {...props} />
}
