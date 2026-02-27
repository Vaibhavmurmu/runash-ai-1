export function GstFilingStatus() {
  return (
    <div className="grid gap-3 md:grid-cols-3 text-sm">
      <div className="rounded-md border p-3"><p className="text-muted-foreground">Returns Filed</p><p className="text-lg font-semibold">11 / 12</p></div>
      <div className="rounded-md border p-3"><p className="text-muted-foreground">Pending Returns</p><p className="text-lg font-semibold">1</p></div>
      <div className="rounded-md border p-3"><p className="text-muted-foreground">Compliance Score</p><p className="text-lg font-semibold">92%</p></div>
    </div>
  )
}
