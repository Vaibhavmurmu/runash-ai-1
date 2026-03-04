import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function TaxSimulator() {
  return (
    <Card>
      <CardHeader><CardTitle>Tax Simulator</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">Adjust revenue, input tax credit and expenses to model tax outcomes.</CardContent>
    </Card>
  )
}
