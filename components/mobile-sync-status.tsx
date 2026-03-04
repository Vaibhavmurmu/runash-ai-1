export function MobileSyncStatus() {
  return (
    <div className="grid gap-3 md:grid-cols-3 text-sm">
      <div className="rounded border p-3"><p className="text-muted-foreground">Connected Devices</p><p className="text-lg font-semibold">3</p></div>
      <div className="rounded border p-3"><p className="text-muted-foreground">Last Sync</p><p className="text-lg font-semibold">2 mins ago</p></div>
      <div className="rounded border p-3"><p className="text-muted-foreground">Sync Health</p><p className="text-lg font-semibold">Healthy</p></div>
    </div>
  )
}
