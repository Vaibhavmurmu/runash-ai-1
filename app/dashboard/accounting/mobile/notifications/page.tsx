import type { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard-shell"
import { NotificationSettings } from "@/components/notification-settings"
import { NotificationSchedule } from "@/components/notification-schedule"
import { NotificationHistory } from "@/components/notification-history"
import { createDashboardMetadata } from "../../../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Mobile Notification Settings",
  description: "Manage your mobile app notification preferences.",
  path: "/dashboard/accounting/mobile/notifications",
})

export default function NotificationSettingsPage() {
  return (
    <DashboardShell>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mobile Notification Settings</h1>
          <p className="text-muted-foreground">Manage your mobile app notification preferences</p>
        </div>
        <div className="grid gap-6">
          <NotificationSettings />
          <div className="grid gap-6 md:grid-cols-2">
            <NotificationSchedule />
            <NotificationHistory />
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
