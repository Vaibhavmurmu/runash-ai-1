import { requireAdminUiRouteAccess } from "@/lib/admin-route-guard"
import AdminDashboardClientPage from "./admin-dashboard-client"

export default async function AdminDashboardPage() {
  await requireAdminUiRouteAccess("/ecommerce/admin")
  return <AdminDashboardClientPage />
}
