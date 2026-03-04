import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function ClientList() {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>GSTIN</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader>
      <TableBody>
        <TableRow><TableCell><Link className="underline" href="/dashboard/accounting/clients/abc-enterprises">ABC Enterprises</Link></TableCell><TableCell>27AAPFU0939F1ZV</TableCell><TableCell className="text-right">₹45,000.00</TableCell></TableRow>
        <TableRow><TableCell>DEF Limited</TableCell><TableCell>29AAACD1234K1Z9</TableCell><TableCell className="text-right">₹18,500.00</TableCell></TableRow>
      </TableBody>
    </Table>
  )
}
