import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function InvoiceItemsTable() {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">GST</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
      <TableBody>
        <TableRow><TableCell>Consulting Services</TableCell><TableCell className="text-right">1</TableCell><TableCell className="text-right">₹30,000.00</TableCell><TableCell className="text-right">18%</TableCell><TableCell className="text-right">₹35,400.00</TableCell></TableRow>
      </TableBody>
    </Table>
  )
}
