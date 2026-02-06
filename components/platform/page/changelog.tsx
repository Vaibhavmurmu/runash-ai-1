export default function ChangelogPage() {
  const versions = [
    { version: "v1.0.0", date: "Jan 18, 2024", changes: ["Initial release", "Core features launched"] },
    { version: "v0.1.0", date: "Jan 18, 2025", changes: ["Beta testing", "Early access"] },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Changelog</h1>
        <p className="text-muted-foreground mt-1">Track platform updates and improvements</p>
      </div>
      <div className="space-y-4">
        {versions.map((v, idx) => (
          <div key={idx} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">{v.version}</span>
              <span className="text-xs text-muted-foreground">{v.date}</span>
            </div>
            <ul className="space-y-1">
              {v.changes.map((change, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span>•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
