"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Download, Plus, Search } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Counterparty = { id: string; entityType: "client" | "vendor"; name: string; gstin: string | null; outstanding: number }
const formatInr = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)

export function ClientsClient() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [counterparties, setCounterparties] = useState<Counterparty[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/v1/accounting/counterparties", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed")
        const payload = await res.json()
        setCounterparties(payload?.data?.counterparties ?? [])
      } catch {
        setError("Failed to load clients and vendors.")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const clients = useMemo(() => counterparties.filter((item) => item.entityType === "client" && item.name.toLowerCase().includes(search.toLowerCase())), [counterparties, search])
  const vendors = useMemo(() => counterparties.filter((item) => item.entityType === "vendor"), [counterparties])

  return (
    <DashboardShell>
      <DashboardHeader heading="Clients & Vendors" text="Manage your business relationships." className="mb-8">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1"><Download className="h-3.5 w-3.5" /><span>Export</span></Button>
          <Link href="/dashboard/accounting/clients/add"><Button size="sm" className="h-8 gap-1 bg-gradient-to-r from-orange-600 to-orange-400"><Plus className="h-3.5 w-3.5" /><span>New Client</span></Button></Link>
        </div>
      </DashboardHeader>

      {loading ? <Card><CardContent className="py-8 text-sm text-muted-foreground">Loading clients and vendors…</CardContent></Card> : null}
      {error ? <Card><CardContent className="py-8 text-sm text-destructive">{error}</CardContent></Card> : null}

      {!loading && !error ? (
        <Tabs defaultValue="clients" className="space-y-4">
          <TabsList><TabsTrigger value="clients">Clients</TabsTrigger><TabsTrigger value="vendors">Vendors</TabsTrigger><TabsTrigger value="groups">Groups</TabsTrigger><TabsTrigger value="statements">Statements</TabsTrigger></TabsList>
          <TabsContent value="clients" className="space-y-4">
            <div className="relative w-full max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Search clients..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-8 w-full" /></div>
            <Card><CardHeader><CardTitle>Client List</CardTitle><CardDescription>Manage your clients and their information</CardDescription></CardHeader><CardContent>
              {clients.length === 0 ? <p className="text-sm text-muted-foreground">No clients found.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>GSTIN</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader>
                  <TableBody>{clients.map((client) => (
                    <TableRow key={client.id}><TableCell>{client.name === "ABC Enterprises" ? <Link className="underline" href="/dashboard/accounting/clients/abc-enterprises">{client.name}</Link> : client.name}</TableCell><TableCell>{client.gstin ?? "-"}</TableCell><TableCell className="text-right">{formatInr(client.outstanding)}</TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="vendors" className="space-y-4"><Card><CardHeader><CardTitle>Vendor List</CardTitle><CardDescription>Manage your vendors and their information</CardDescription></CardHeader><CardContent>
            {vendors.length === 0 ? <p className="text-sm text-muted-foreground">No vendors found.</p> : (
              <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>GSTIN</TableHead><TableHead className="text-right">Payable</TableHead></TableRow></TableHeader><TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id}><TableCell>{vendor.name}</TableCell><TableCell>{vendor.gstin ?? "-"}</TableCell><TableCell className="text-right">{formatInr(vendor.outstanding)}</TableCell></TableRow>
                ))}
              </TableBody></Table>
            )}
          </CardContent></Card></TabsContent>
          <TabsContent value="groups"><Card><CardHeader><CardTitle>Client & Vendor Groups</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Group Name</TableHead><TableHead>Type</TableHead><TableHead>Members</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Regular Customers</TableCell><TableCell>Client</TableCell><TableCell>{clients.length}</TableCell></TableRow></TableBody></Table></CardContent></Card></TabsContent>
          <TabsContent value="statements"><Card><CardHeader><CardTitle>Client Statements</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Generate and send statements to clients.</p></CardContent></Card></TabsContent>
        </Tabs>
      ) : null}
    </DashboardShell>
  )
}
