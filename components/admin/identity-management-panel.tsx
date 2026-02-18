"use client"

import { useEffect, useState } from "react"

type Provider = {
  id: number
  organization_id: number
  provider_type: string
  provider_name: string
  updated_at: string
}

type ProtocolHealth = {
  protocol: string
  configured: number
  health: string
  lastUpdatedAt: string | null
}

export function IdentityManagementPanel() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [healthStatus, setHealthStatus] = useState<ProtocolHealth[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [providersResponse, healthResponse] = await Promise.all([
        fetch("/api/admin/identity/providers", { cache: "no-store" }),
        fetch("/api/admin/identity/health", { cache: "no-store" }),
      ])

      if (providersResponse.ok) {
        const payload = (await providersResponse.json()) as { data: Provider[] }
        setProviders(payload.data)
      }

      if (healthResponse.ok) {
        const payload = (await healthResponse.json()) as { data: ProtocolHealth[] }
        setHealthStatus(payload.data)
      }

      setLoading(false)
    }

    void load()
  }, [])

  if (loading) {
    return <div className="rounded-lg border p-6 text-sm text-muted-foreground">Loading identity configuration…</div>
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Configured Providers</h2>
        <ul className="space-y-2 text-sm">
          {providers.map((provider) => (
            <li key={provider.id} className="rounded border p-2">
              <div className="font-medium">{provider.provider_name}</div>
              <div className="text-muted-foreground">
                {provider.provider_type.toUpperCase()} · Org #{provider.organization_id}
              </div>
            </li>
          ))}
          {providers.length === 0 ? <li className="text-muted-foreground">No identity providers configured yet.</li> : null}
        </ul>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Protocol Health</h2>
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
    </section>
  )
}
