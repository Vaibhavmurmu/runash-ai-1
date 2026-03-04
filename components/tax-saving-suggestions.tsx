import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function TaxSavingSuggestions() {
  return (
    <Card>
      <CardHeader><CardTitle>Tax Saving Suggestions</CardTitle></CardHeader>
      <CardContent className="text-sm">Automated suggestions based on simulated cash-flow and GST profile.</CardContent>
    </Card>
  )
}
