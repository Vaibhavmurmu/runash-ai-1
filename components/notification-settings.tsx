import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function NotificationSettings() {
  return <Card><CardHeader><CardTitle>Notification Settings</CardTitle></CardHeader><CardContent className="text-sm">Configure push alerts for due invoices, GST filings, and sync events.</CardContent></Card>
}
