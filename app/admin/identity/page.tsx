import { IdentityManagementPanel } from "@/components/admin/identity-management-panel"

export default function AdminIdentityPage() {
  return (
    <main className="container mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Identity Providers & Protocol Health</h1>
        <p className="text-sm text-muted-foreground">
          Manage OIDC/OAuth2/SAML2 enterprise providers, SCIM provisioning, and protocol runtime health from one place.
        </p>
      </header>
      <IdentityManagementPanel />
    </main>
  )
}
