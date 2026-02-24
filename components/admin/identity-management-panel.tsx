"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { CardAlert } from "@/components/ui/card-alert"
import { CardAlertDialog } from "@/components/ui/card-alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Provider = {
  id: number
  organization_id: number
  provider_type: string
  provider_name: string
  updated_at: string
}

type Organization = {
  id: number
  name: string
  domain: string
  slug: string
  sso_enabled: boolean
  auto_provision: boolean
  default_role: string
  is_active: boolean
}

type TenantUser = {
  id: number
  email: string
  name: string | null
  role: string | null
  sso_organization_id: number | null
}

type ProtocolHealth = {
  protocol: string
  configured: number
  health: string
  lastUpdatedAt: string | null
}

const emptyOrg = { name: "", domain: "", slug: "", defaultRole: "user" }
const emptyProvider = { organizationId: "", providerName: "", providerType: "oidc", mappingKey: "", mappingValue: "" }

export function IdentityManagementPanel() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([])
  const [healthStatus, setHealthStatus] = useState<ProtocolHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [providerChangeCandidate, setProviderChangeCandidate] = useState<Provider | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState<string>("")
  const [orgForm, setOrgForm] = useState(emptyOrg)
  const [providerForm, setProviderForm] = useState(emptyProvider)
  const [tenantUserIdInput, setTenantUserIdInput] = useState("")

  const activeOrganizations = useMemo(() => organizations.filter((organization) => organization.is_active), [organizations])

  async function loadPanel() {
    setLoading(true)
    const [providersResponse, healthResponse, organizationsResponse] = await Promise.all([
      fetch("/api/admin/identity/providers", { cache: "no-store" }),
      fetch("/api/admin/identity/health", { cache: "no-store" }),
      fetch("/api/admin/sso/organizations", { cache: "no-store" }),
    ])

    if (providersResponse.ok) {
      const payload = (await providersResponse.json()) as { data: Provider[] }
      setProviders(payload.data)
    }

    if (healthResponse.ok) {
      const payload = (await healthResponse.json()) as { data: ProtocolHealth[] }
      setHealthStatus(payload.data)
    }

    if (organizationsResponse.ok) {
      const payload = (await organizationsResponse.json()) as { data: Organization[] }
      setOrganizations(payload.data)
      if (!selectedOrgId && payload.data[0]?.id) {
        setSelectedOrgId(String(payload.data[0].id))
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadPanel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedOrgId) {
      setTenantUsers([])
      return
    }

    ;(async () => {
      const tenantResponse = await fetch(`/api/admin/sso/organizations/${selectedOrgId}/users`, { cache: "no-store" })
      if (tenantResponse.ok) {
        const payload = (await tenantResponse.json()) as { data: TenantUser[] }
        setTenantUsers(payload.data)
      }
    })()
  }, [selectedOrgId])

  if (loading) {
    return <div className="rounded-lg border p-6 text-sm text-muted-foreground">Loading identity configuration…</div>
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-lg font-medium">Configured Providers</h2>
          <ul className="space-y-2 text-sm">
            {providers.map((provider) => (
              <li key={provider.id} className="rounded border p-2">
                <div className="font-medium">{provider.provider_name}</div>
                <div className="text-muted-foreground">
                  {provider.provider_type.toUpperCase()} · Org #{provider.organization_id}
                </div>
                <div className="mt-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setProviderChangeCandidate(provider)}>
                    Request provider change
                  </Button>
                </div>
              </li>
            ))}
            {providers.length === 0 ? <li className="text-muted-foreground">No identity providers configured yet.</li> : null}
          </ul>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-lg font-medium">Protocol Health</h2>
          <CardAlert
            severity="warning"
            title="Provider change safety"
            description="Provider updates can interrupt SSO sign-ins. Confirm cutover windows and rollback steps before applying changes."
            className="mb-3"
          />
          <ul className="space-y-2 text-sm">
            {healthStatus.map((item) => (
              <li key={item.protocol} className="rounded border p-2">
                <div className="font-medium uppercase">{item.protocol}</div>
                <div className="text-muted-foreground">
                  {item.health} · {item.configured} configured
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-medium">Organization lifecycle</h3>
          <Label>Name</Label>
          <Input value={orgForm.name} onChange={(event) => setOrgForm((state) => ({ ...state, name: event.target.value }))} />
          <Label>Domain</Label>
          <Input value={orgForm.domain} onChange={(event) => setOrgForm((state) => ({ ...state, domain: event.target.value }))} />
          <Label>Slug</Label>
          <Input value={orgForm.slug} onChange={(event) => setOrgForm((state) => ({ ...state, slug: event.target.value }))} />
          <Button
            size="sm"
            onClick={async () => {
              await fetch("/api/admin/sso/organizations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: orgForm.name,
                  domain: orgForm.domain,
                  slug: orgForm.slug,
                  defaultRole: orgForm.defaultRole,
                  ssoEnabled: true,
                  autoProvision: true,
                }),
              })
              setOrgForm(emptyOrg)
              await loadPanel()
            }}
          >
            Create organization
          </Button>
          <div className="text-xs text-muted-foreground">Deactivate or update by selecting an org below.</div>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-medium">Provider mapping tools</h3>
          <Label>Organization</Label>
          <Input
            value={providerForm.organizationId}
            onChange={(event) => setProviderForm((state) => ({ ...state, organizationId: event.target.value }))}
            placeholder="Organization ID"
          />
          <Label>Provider name</Label>
          <Input
            value={providerForm.providerName}
            onChange={(event) => setProviderForm((state) => ({ ...state, providerName: event.target.value }))}
          />
          <Label>Mapping key</Label>
          <Input
            value={providerForm.mappingKey}
            onChange={(event) => setProviderForm((state) => ({ ...state, mappingKey: event.target.value }))}
            placeholder="e.g. department"
          />
          <Label>Mapping value</Label>
          <Input
            value={providerForm.mappingValue}
            onChange={(event) => setProviderForm((state) => ({ ...state, mappingValue: event.target.value }))}
            placeholder="e.g. org_slug"
          />
          <Button
            size="sm"
            onClick={async () => {
              await fetch("/api/admin/identity/providers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  organizationId: Number(providerForm.organizationId),
                  providerType: providerForm.providerType,
                  providerName: providerForm.providerName,
                  orgMappings: providerForm.mappingKey
                    ? {
                        [providerForm.mappingKey]: providerForm.mappingValue,
                      }
                    : {},
                }),
              })
              setProviderForm(emptyProvider)
              await loadPanel()
            }}
          >
            Upsert provider + mapping
          </Button>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-medium">Tenant-scoped user operations</h3>
          <Label>Organization</Label>
          <select
            className="w-full rounded-md border bg-background px-2 py-2 text-sm"
            value={selectedOrgId}
            onChange={(event) => setSelectedOrgId(event.target.value)}
          >
            <option value="">Select organization</option>
            {activeOrganizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name} ({organization.slug})
              </option>
            ))}
          </select>
          <Label>User ID</Label>
          <Input value={tenantUserIdInput} onChange={(event) => setTenantUserIdInput(event.target.value)} />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                if (!selectedOrgId) return
                await fetch(`/api/admin/sso/organizations/${selectedOrgId}/users`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId: Number(tenantUserIdInput) }),
                })
                const tenantResponse = await fetch(`/api/admin/sso/organizations/${selectedOrgId}/users`, { cache: "no-store" })
                if (tenantResponse.ok) {
                  const payload = (await tenantResponse.json()) as { data: TenantUser[] }
                  setTenantUsers(payload.data)
                }
              }}
            >
              Assign
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (!selectedOrgId) return
                await fetch(`/api/admin/sso/organizations/${selectedOrgId}`, { method: "DELETE" })
                await loadPanel()
              }}
            >
              Deactivate org
            </Button>
          </div>
          <ul className="space-y-1 text-xs">
            {tenantUsers.map((user) => (
              <li key={user.id} className="flex items-center justify-between rounded border p-1">
                <span>{user.email}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (!selectedOrgId) return
                    await fetch(`/api/admin/sso/organizations/${selectedOrgId}/users/${user.id}`, { method: "DELETE" })
                    setTenantUsers((state) => state.filter((tenantUser) => tenantUser.id !== user.id))
                  }}
                >
                  Unassign
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="mb-2 font-medium">Organizations</h3>
        <ul className="space-y-2 text-sm">
          {organizations.map((organization) => (
            <li key={organization.id} className="flex items-center justify-between rounded border p-2">
              <span>
                {organization.name} ({organization.slug}) · {organization.domain}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await fetch(`/api/admin/sso/organizations/${organization.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ssoEnabled: !organization.sso_enabled }),
                  })
                  await loadPanel()
                }}
              >
                Toggle SSO
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <CardAlertDialog
        open={providerChangeCandidate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setProviderChangeCandidate(null)
          }
        }}
        severity="warning"
        title="Confirm identity provider change"
        description={`Proceed with a change request for ${providerChangeCandidate?.provider_name ?? "the selected provider"}. Validate downstream SSO mappings and rollback procedures first.`}
        confirmLabel="Acknowledge risk"
        cancelLabel="Cancel"
        confirmAriaLabel="Confirm provider change risk acknowledgement"
        onConfirm={() => {
          setProviderChangeCandidate(null)
        }}
      />
    </section>
  )
}
