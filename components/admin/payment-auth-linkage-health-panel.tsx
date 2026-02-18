"use client"

import { useEffect, useState } from "react"

type LinkageSummary = {
  totalLinks: number
  linkedUsers: number
  unlinkedCustomers: number
  usersWithoutCustomer: number
  staleLinks: number
}

type StaleLink = {
  user_id: string
  payment_customer_id: string
  payment_subscription_id: string | null
  subscription_status: string | null
  updated_at: string
}

export function PaymentAuthLinkageHealthPanel() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<LinkageSummary | null>(null)
  const [staleLinks, setStaleLinks] = useState<StaleLink[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/admin/payment-auth/health", { cache: "no-store" })
        if (!response.ok) {
          setError("Failed to load payment-auth linkage health")
          return
        }

        const payload = (await response.json()) as {
          data: {
            summary: LinkageSummary
            staleSample: StaleLink[]
          }
        }

        setSummary(payload.data.summary)
        setStaleLinks(payload.data.staleSample)
      } catch {
        setError("Failed to load payment-auth linkage health")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  if (loading) {
    return <div className="rounded-lg border p-6 text-sm text-muted-foreground">Loading payment-auth linkage health…</div>
  }

  if (error || !summary) {
    return <div className="rounded-lg border border-destructive/40 p-6 text-sm text-destructive">{error ?? "No data available"}</div>
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Total Links" value={summary.totalLinks} />
        <MetricCard label="Linked Users" value={summary.linkedUsers} />
        <MetricCard label="Unlinked Customers" value={summary.unlinkedCustomers} />
        <MetricCard label="Users Missing Customer" value={summary.usersWithoutCustomer} />
        <MetricCard label="Stale Links (30d+)" value={summary.staleLinks} />
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Stale linkage sample</h2>
        {staleLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stale linkages detected.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-2 py-2">User</th>
                  <th className="px-2 py-2">Customer</th>
                  <th className="px-2 py-2">Subscription</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {staleLinks.map((row) => (
                  <tr key={`${row.user_id}-${row.payment_customer_id}`} className="border-t">
                    <td className="px-2 py-2 font-mono text-xs">{row.user_id}</td>
                    <td className="px-2 py-2 font-mono text-xs">{row.payment_customer_id}</td>
                    <td className="px-2 py-2 font-mono text-xs">{row.payment_subscription_id ?? "—"}</td>
                    <td className="px-2 py-2">{row.subscription_status ?? "—"}</td>
                    <td className="px-2 py-2">{new Date(row.updated_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}
