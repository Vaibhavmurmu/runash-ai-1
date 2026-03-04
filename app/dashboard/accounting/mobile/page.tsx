import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { MobileQrCode } from "@/components/mobile-qr-code"
import { MobileFeatures } from "@/components/mobile-features"
import { MobileSyncStatus } from "@/components/mobile-sync-status"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, Settings, Smartphone } from "lucide-react"
import { createDashboardMetadata } from "../../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Mobile App Integration",
  description: "Connect and manage your RunAshBooks mobile application.",
  path: "/dashboard/accounting/mobile",
})

export default function MobilePage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Mobile App Integration" text="Connect and manage your RunAshBooks mobile application." className="mb-8">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1"><RefreshCw className="h-3.5 w-3.5" /><span>Sync Now</span></Button>
          <Button size="sm" className="h-8 gap-1 bg-gradient-to-r from-orange-600 to-orange-400"><Settings className="h-3.5 w-3.5" /><span>Settings</span></Button>
        </div>
      </DashboardHeader>
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="md:col-span-1"><CardHeader><CardTitle className="flex items-center"><Smartphone className="mr-2 h-5 w-5 text-orange-500" />Connect Mobile App</CardTitle><CardDescription>Scan QR code to connect your mobile device</CardDescription></CardHeader><CardContent className="flex flex-col items-center"><MobileQrCode /><Button className="mt-4 w-full bg-gradient-to-r from-orange-600 to-orange-400">Download Mobile App</Button></CardContent></Card>
        <Card className="md:col-span-2"><CardHeader><CardTitle>Mobile Sync Status</CardTitle><CardDescription>Current synchronization status with mobile devices</CardDescription></CardHeader><CardContent><MobileSyncStatus /></CardContent></Card>
      </div>
      <Tabs defaultValue="features" className="space-y-4">
        <TabsList><TabsTrigger value="features">Features</TabsTrigger><TabsTrigger value="settings">Sync Settings</TabsTrigger><TabsTrigger value="notifications">Notifications</TabsTrigger></TabsList>
        <TabsContent value="features"><Card><CardHeader><CardTitle>Mobile App Features</CardTitle></CardHeader><CardContent><MobileFeatures /></CardContent></Card></TabsContent>
        <TabsContent value="settings"><Card><CardHeader><CardTitle>Sync Settings</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Configure what data syncs with mobile devices.</p></CardContent></Card></TabsContent>
        <TabsContent value="notifications"><Card><CardHeader><CardTitle>Mobile Notifications</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Configure push notifications for mobile devices.</p></CardContent></Card></TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
