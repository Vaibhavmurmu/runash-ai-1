"use client"

import { useEffect, useState } from "react"
import { Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ReportsPayload = {
  balanceSheet: { assets: number; liabilities: number; equity: number }
  profitAndLoss: { revenue: number; expenses: number; netProfit: number }
  cashFlow: { operating: number; investing: number; financing: number }
  gstSummary: { outputTax: number; inputTaxCredit: number; netTaxPayable: number }
}

const formatInr = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)

export function ReportsClient() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReportsPayload | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/v1/accounting/reports", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed")
        const payload = await res.json()
        setData(payload?.data ?? null)
      } catch {
        setError("Failed to load financial reports.")
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
          <h1 className="text-2xl font-semibold">Financial Reports</h1>
          <p className="text-sm text-muted-foreground">Generate and view your financial statements.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1"><Printer className="h-3.5 w-3.5" />Print</Button>
          <Button variant="outline" size="sm" className="h-8 gap-1"><Download className="h-3.5 w-3.5" />Export</Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Financial Year 2024-25</div>
        <Select defaultValue="may"><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="may">May 2025</SelectItem><SelectItem value="q1">Q1 (Apr-Jun 2025)</SelectItem><SelectItem value="fy">Full Year 2024-25</SelectItem>
        </SelectContent></Select>
      </div>

      {loading ? <Card><CardContent className="py-8 text-sm text-muted-foreground">Loading reports…</CardContent></Card> : null}
      {error ? <Card><CardContent className="py-8 text-sm text-destructive">{error}</CardContent></Card> : null}
      {!loading && !error && !data ? <Card><CardContent className="py-8 text-sm text-muted-foreground">No report data available.</CardContent></Card> : null}

      {!loading && !error && data ? (
        <Tabs defaultValue="balance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
            <TabsTrigger value="profit">Profit & Loss</TabsTrigger>
            <TabsTrigger value="cash">Cash Flow</TabsTrigger>
            <TabsTrigger value="gst">GST Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="balance"><Card><CardHeader><CardTitle>Balance Sheet</CardTitle></CardHeader><CardContent className="text-sm">Assets: {formatInr(data.balanceSheet.assets)} · Liabilities: {formatInr(data.balanceSheet.liabilities)} · Equity: {formatInr(data.balanceSheet.equity)}</CardContent></Card></TabsContent>
          <TabsContent value="profit"><Card><CardHeader><CardTitle>Profit & Loss</CardTitle></CardHeader><CardContent className="text-sm">Revenue: {formatInr(data.profitAndLoss.revenue)} · Expenses: {formatInr(data.profitAndLoss.expenses)} · Net Profit: {formatInr(data.profitAndLoss.netProfit)}</CardContent></Card></TabsContent>
          <TabsContent value="cash"><Card><CardHeader><CardTitle>Cash Flow</CardTitle></CardHeader><CardContent className="text-sm">Operating: {formatInr(data.cashFlow.operating)} · Investing: {formatInr(data.cashFlow.investing)} · Financing: {formatInr(data.cashFlow.financing)}</CardContent></Card></TabsContent>
          <TabsContent value="gst" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>GSTR-3B Summary</CardTitle><CardDescription>Tax liability snapshot</CardDescription></CardHeader>
              <CardContent>
                <Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>
                  <TableRow><TableCell>Output Tax</TableCell><TableCell className="text-right">{formatInr(data.gstSummary.outputTax)}</TableCell></TableRow>
                  <TableRow><TableCell>Input Tax Credit</TableCell><TableCell className="text-right">{formatInr(data.gstSummary.inputTaxCredit)}</TableCell></TableRow>
                  <TableRow><TableCell>Net Tax Payable</TableCell><TableCell className="text-right">{formatInr(data.gstSummary.netTaxPayable)}</TableCell></TableRow>
                </TableBody></Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  )
}
