import MobileLayout from "@/components/mobile/layout"
import { SettingsShell } from "@/components/settings/settings-shell"

export default function MobileSettingsPage() {
  return (
    <MobileLayout>
      <SettingsShell compact />
    </MobileLayout>
  )
}
