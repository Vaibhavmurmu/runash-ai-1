import UsersClientPage from "./users-client"
import { requireAdminUiRouteAccess } from "@/lib/admin-route-guard"

export default async function UsersPage() {
  await requireAdminUiRouteAccess("/admin/users")
  return <UsersClientPage />
}
