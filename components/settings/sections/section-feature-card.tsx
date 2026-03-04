import type { ReactNode } from "react"
import {
  SettingsActionBar,
  SettingsSectionCard,
  type SettingsStatus,
} from "@/components/settings/sections/settings-presentation"

interface SectionFeatureCardProps {
  panelId?: string
  title: string
  description: string
  status: SettingsStatus
  actionLabel: string
  disabled?: boolean
  onAction: () => void
  actionSlot?: ReactNode
  children?: ReactNode
}

export function SectionFeatureCard({
  panelId,
  title,
  description,
  status,
  actionLabel,
  disabled = false,
  onAction,
  actionSlot,
  children,
}: SectionFeatureCardProps) {
  return (
    <SettingsSectionCard panelId={panelId} title={title} description={description} status={status}>
      {children}
      <SettingsActionBar primaryActionLabel={actionLabel} onPrimaryAction={onAction} disabled={disabled}>
        {actionSlot}
      </SettingsActionBar>
    </SettingsSectionCard>
  )
}
