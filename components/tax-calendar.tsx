import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function TaxCalendar() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Due Date</TableHead>
          <TableHead>Filing</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow><TableCell>11 May 2025</TableCell><TableCell>GSTR-1</TableCell><TableCell>Upcoming</TableCell></TableRow>
        <TableRow><TableCell>20 May 2025</TableCell><TableCell>GSTR-3B</TableCell><TableCell>Upcoming</TableCell></TableRow>
      </TableBody>
    </Table>
  )
}
