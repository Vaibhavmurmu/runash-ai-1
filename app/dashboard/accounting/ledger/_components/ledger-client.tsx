"use client"

import { useEffect, useState } from "react"
import { Download, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Account = { code: string; name: string; accountType: string; balance: number }
type Entry = { entryDate: string; voucherCode: string; accountName: string; debit: number; credit: number }
type TrialRow = { account: string; debit: number; credit: number }

const formatInr = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)

export function LedgerClient() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [trialRows, setTrialRows] = useState<TrialRow[]>([])
  const [totals, setTotals] = useState({ totalDebit: 0, totalCredit: 0 })

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [accountsRes, entriesRes, trialRes] = await Promise.all([
          fetch("/api/v1/accounting/chart-of-accounts", { cache: "no-store" }),
          fetch("/api/v1/accounting/ledger-entries", { cache: "no-store" }),
          fetch("/api/v1/accounting/trial-balance", { cache: "no-store" }),
        ])

        if (!accountsRes.ok || !entriesRes.ok || !trialRes.ok) {
          throw new Error("Unable to load accounting ledger data")
        }

        const accountsData = await accountsRes.json()
        const entriesData = await entriesRes.json()
        const trialData = await trialRes.json()

        setAccounts(accountsData?.data?.accounts ?? [])
        setEntries(entriesData?.data?.entries ?? [])
        setTrialRows(trialData?.data?.rows ?? [])
        setTotals({ totalDebit: trialData?.data?.totalDebit ?? 0, totalCredit: trialData?.data?.totalCredit ?? 0 })
      } catch {
        setError("Failed to load ledger data.")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ledger</h1>
          <p className="text-sm text-muted-foreground">Manage your accounts and ledger entries.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1"><Download className="h-3.5 w-3.5" />Export</Button>
          <Button size="sm" className="h-8 gap-1 bg-gradient-to-r from-orange-600 to-orange-400"><Plus className="h-3.5 w-3.5" />New Account</Button>
        </div>
      </div>

      {loading ? <Card><CardContent className="py-8 text-sm text-muted-foreground">Loading ledger data…</CardContent></Card> : null}
      {error ? <Card><CardContent className="py-8 text-sm text-destructive">{error}</CardContent></Card> : null}

      {!loading && !error ? (
        <Tabs defaultValue="accounts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="entries">Ledger Entries</TabsTrigger>
            <TabsTrigger value="trial">Trial Balance</TabsTrigger>
          </TabsList>
          <TabsContent value="accounts" className="space-y-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search accounts..." className="pl-8 w-full" />
            </div>
            <Card><CardHeader><CardTitle>Chart of Accounts</CardTitle><CardDescription>Manage your accounting structure</CardDescription></CardHeader><CardContent>
              {accounts.length === 0 ? <p className="text-sm text-muted-foreground">No accounts found.</p> : (
                <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                  <TableBody>{accounts.map((account) => (
                    <TableRow key={account.code}><TableCell>{account.code}</TableCell><TableCell>{account.name}</TableCell><TableCell>{account.accountType}</TableCell><TableCell className="text-right">{formatInr(account.balance)}</TableCell></TableRow>
                  ))}</TableBody></Table>
              )}
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="entries">
            <Card><CardHeader><CardTitle>Ledger Entries</CardTitle></CardHeader><CardContent>
              {entries.length === 0 ? <p className="text-sm text-muted-foreground">No ledger entries found.</p> : (
                <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Voucher</TableHead><TableHead>Account</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow></TableHeader>
                  <TableBody>{entries.map((entry) => (
                    <TableRow key={`${entry.voucherCode}-${entry.accountName}-${entry.entryDate}`}><TableCell>{entry.entryDate}</TableCell><TableCell>{entry.voucherCode}</TableCell><TableCell>{entry.accountName}</TableCell><TableCell className="text-right">{entry.debit > 0 ? formatInr(entry.debit) : "-"}</TableCell><TableCell className="text-right">{entry.credit > 0 ? formatInr(entry.credit) : "-"}</TableCell></TableRow>
                  ))}</TableBody></Table>
              )}
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="trial">
            <Card><CardHeader><CardTitle>Trial Balance</CardTitle></CardHeader><CardContent>
              {trialRows.length === 0 ? <p className="text-sm text-muted-foreground">No trial balance rows found.</p> : (
                <Table><TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow></TableHeader>
                  <TableBody>{trialRows.map((row) => (
                    <TableRow key={row.account}><TableCell>{row.account}</TableCell><TableCell className="text-right">{row.debit > 0 ? formatInr(row.debit) : "-"}</TableCell><TableCell className="text-right">{row.credit > 0 ? formatInr(row.credit) : "-"}</TableCell></TableRow>
                  ))}
                    <TableRow className="font-bold"><TableCell>Total</TableCell><TableCell className="text-right">{formatInr(totals.totalDebit)}</TableCell><TableCell className="text-right">{formatInr(totals.totalCredit)}</TableCell></TableRow>
                  </TableBody></Table>
              )}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  )
}
