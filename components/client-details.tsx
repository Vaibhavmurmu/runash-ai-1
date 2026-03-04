import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ClientDetailsProps { clientId: string }

export function ClientDetails({ clientId }: ClientDetailsProps) {
  return (
    <Card>
      <CardHeader><CardTitle>Client {clientId}</CardTitle></CardHeader>
      <CardContent className="text-sm">Client profile, statements, aging, and communication log will appear here.</CardContent>
    </Card>
  )
}
