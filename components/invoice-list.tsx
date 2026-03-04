import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface InvoiceListProps {
  type: "sales" | "purchase"
}

export function InvoiceList({ type }: InvoiceListProps) {
  const rows =
    type === "sales"
      ? [["INV-001", "ABC Enterprises", "₹23,600", "Paid"], ["INV-002", "DEF Limited", "₹35,400", "Pending"]]
      : [["PINV-001", "XYZ Suppliers", "₹17,700", "Booked"], ["PINV-002", "PQR Traders", "₹23,600", "Booked"]]

  return (
    <Table>
      <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Party</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row[0]}>
            <TableCell>{row[0]}</TableCell><TableCell>{row[1]}</TableCell><TableCell className="text-right">{row[2]}</TableCell><TableCell>{row[3]}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
