import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function VendorList() {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>GSTIN</TableHead><TableHead className="text-right">Payable</TableHead></TableRow></TableHeader>
      <TableBody>
        <TableRow><TableCell>XYZ Suppliers</TableCell><TableCell>27AABCU9603R1ZX</TableCell><TableCell className="text-right">₹23,600.00</TableCell></TableRow>
      </TableBody>
    </Table>
  )
}
