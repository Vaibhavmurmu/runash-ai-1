"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Printer, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { InvoiceItemsTable } from "@/components/invoice-items-table"
import { InvoicePreview } from "@/components/invoice-preview"

export default function CreateInvoicePage() {
  const [activeTab, setActiveTab] = useState("details")

  return (
    <DashboardShell>
      <DashboardHeader heading="Create Invoice" text="Generate a new GST-compliant invoice." className="mb-8">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/accounting/invoices">
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Save className="h-3.5 w-3.5" />
            <span>Save Draft</span>
          </Button>
        </div>
      </DashboardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Invoice Details</TabsTrigger>
          <TabsTrigger value="items">Line Items</TabsTrigger>
          <TabsTrigger value="preview">Preview & Send</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Invoice Information</CardTitle><CardDescription>Enter the basic invoice details</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="invoice-number">Invoice Number</Label><Input id="invoice-number" placeholder="INV-001" /></div>
                  <div className="space-y-2"><Label htmlFor="invoice-date">Invoice Date</Label><Input id="invoice-date" type="date" defaultValue={new Date().toISOString().split("T")[0]} /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="invoice-type">Invoice Type</Label><Select defaultValue="regular"><SelectTrigger id="invoice-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="regular">Regular</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="gstin">GSTIN</Label><Input id="gstin" placeholder="27AAPFU0939F1ZV" /></div>
                <div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" placeholder="Enter any additional notes..." className="min-h-[80px]" /></div>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle>Customer Details</CardTitle><CardDescription>Select or add a customer</CardDescription></CardHeader><CardContent className="space-y-4"><Input placeholder="Customer name" /><Input placeholder="customer@email.com" /></CardContent></Card>
          </div>
          <div className="flex justify-end"><Button className="bg-gradient-to-r from-orange-600 to-orange-400" onClick={() => setActiveTab("items")}>Continue to Line Items</Button></div>
        </TabsContent>
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Invoice Items</CardTitle><CardDescription>Add products or services to your invoice</CardDescription></CardHeader>
            <CardContent><InvoiceItemsTable /></CardContent>
            <CardFooter className="flex justify-between"><Button variant="outline" onClick={() => setActiveTab("details")}>Back to Details</Button><Button className="bg-gradient-to-r from-orange-600 to-orange-400" onClick={() => setActiveTab("preview")}>Continue to Preview</Button></CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Invoice Preview</CardTitle><CardDescription>Review your invoice before finalizing</CardDescription></CardHeader>
            <CardContent><InvoicePreview /></CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("items")}>Back to Items</Button>
              <div className="flex gap-2">
                <Button variant="outline"><Printer className="mr-2 h-4 w-4" />Print</Button>
                <Button variant="outline"><Download className="mr-2 h-4 w-4" />Download PDF</Button>
                <Button className="bg-gradient-to-r from-orange-600 to-orange-400"><Save className="mr-2 h-4 w-4" />Save & Finalize</Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
