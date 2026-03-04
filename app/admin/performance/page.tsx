import type { Metadata } from "next"
import { PerformanceDashboard } from "@/components/admin/performance-dashboard"
import { requireAdminUiRouteAccess } from "@/lib/admin-route-guard"

export const metadata: Metadata = {
  title: "Performance Dashboard - Admin",
  description: "Monitor system performance and optimize resource usage",
}

export default async function PerformancePage() {
  await requireAdminUiRouteAccess("/admin/performance")
  return <PerformanceDashboard />
}
