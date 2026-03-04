import { PaymentAuthLinkageHealthPanel } from "@/components/admin/payment-auth-linkage-health-panel"
import { requireAdminUiRouteAccess } from "@/lib/admin-route-guard"

export default async function PaymentAuthAdminPage() {
  await requireAdminUiRouteAccess("/admin/payment-auth")

  return (
    <main className="container mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Payment ↔ Auth Linkage Health</h1>
        <p className="text-sm text-muted-foreground">
          Monitor user-to-customer sync coverage and stale linkage issues for subscription lifecycle reliability.
        </p>
      </header>
      <PaymentAuthLinkageHealthPanel />
    </main>
  )
}
