import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function GstReturns() {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Return</TableHead><TableHead>Period</TableHead><TableHead>Filed On</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody>
        <TableRow><TableCell>GSTR-1</TableCell><TableCell>Mar 2025</TableCell><TableCell>10 Apr 2025</TableCell><TableCell>Filed</TableCell></TableRow>
        <TableRow><TableCell>GSTR-3B</TableCell><TableCell>Mar 2025</TableCell><TableCell>19 Apr 2025</TableCell><TableCell>Filed</TableCell></TableRow>
      </TableBody>
    </Table>
  )
}
