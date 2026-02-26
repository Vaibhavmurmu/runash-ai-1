import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function TaxRateAnalysis() {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Rate</TableHead><TableHead className="text-right">Taxable Value</TableHead></TableRow></TableHeader>
      <TableBody>
        <TableRow><TableCell>5%</TableCell><TableCell className="text-right">₹80,000.00</TableCell></TableRow>
        <TableRow><TableCell>12%</TableCell><TableCell className="text-right">₹1,20,000.00</TableCell></TableRow>
        <TableRow><TableCell>18%</TableCell><TableCell className="text-right">₹2,40,000.00</TableCell></TableRow>
      </TableBody>
    </Table>
  )
}
