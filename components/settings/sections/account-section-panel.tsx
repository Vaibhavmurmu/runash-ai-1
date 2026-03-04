import { AccountSettings } from "@/components/settings/sections/account-settings"
import type { SettingsSection } from "@/components/settings/types"
import type { FieldChangeHandler, SettingsSectionErrors } from "@/components/settings/sections/section-panel-types"

interface AccountSectionPanelProps {
  data: Parameters<typeof AccountSettings>[0]["data"]
  isDisabled: boolean
  isSaving: boolean
  errors: SettingsSectionErrors
  onFieldChange: FieldChangeHandler
  onSave: (section: SettingsSection) => void
  onAction: Parameters<typeof AccountSettings>[0]["onAction"]
}

export function AccountSectionPanel(props: AccountSectionPanelProps) {
  return <AccountSettings {...props} />
}
