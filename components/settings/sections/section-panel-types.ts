import type { SettingsData, SettingsSection } from "@/components/settings/types"

export type SettingsSectionErrors = Partial<Record<SettingsSection, string>>

export type FieldChangeHandler = <TSection extends SettingsSection, TField extends keyof SettingsData[TSection]>(
  section: TSection,
  field: TField,
  value: SettingsData[TSection][TField]
) => void
