import type { Metadata } from "next"
import { Download, Plus, Search } from "lucide-react"
import { createDashboardMetadata } from "../../metadata"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export const metadata: Metadata = createDashboardMetadata({
  title: "Journal",
  description: "Record and manage journal entries for RunAshBook workflows.",
  path: "/dashboard/accounting/journal",
})

export default function JournalPage() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Journal</h1>
          <p className="text-sm text-muted-foreground">Record and manage your journal entries.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </Button>
          <Button size="sm" className="h-8 gap-1 bg-gradient-to-r from-orange-600 to-orange-400">
            <Plus className="h-3.5 w-3.5" />
            <span>New Entry</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search entries..." className="pl-8 w-full" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Entry Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entries</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="journal">Journal Voucher</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="current">
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Month</SelectItem>
                <SelectItem value="last">Last Month</SelectItem>
                <SelectItem value="quarter">Current Quarter</SelectItem>
                <SelectItem value="year">Current Financial Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Journal Entries</CardTitle>
            <CardDescription>All transactions recorded in your journal</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Voucher No.</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ["09/05/2025", "JV-005", "Journal", "Depreciation entry", "5,000.00"],
                  ["08/05/2025", "SI-003", "Sales", "Sales to ABC Enterprises", "23,600.00"],
                  ["07/05/2025", "PI-002", "Purchase", "Purchase from XYZ Suppliers", "17,700.00"],
                  ["06/05/2025", "BP-001", "Payment", "Rent payment", "15,000.00"],
                  ["05/05/2025", "PI-001", "Purchase", "Purchase from PQR Traders", "23,600.00"],
                ].map(([date, voucher, type, description, amount]) => (
                  <TableRow key={voucher}>
                    <TableCell>{date}</TableCell>
                    <TableCell className="font-medium">{voucher}</TableCell>
                    <TableCell>{type}</TableCell>
                    <TableCell>{description}</TableCell>
                    <TableCell className="text-right">{amount}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-50 text-green-600">
                        Posted
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
