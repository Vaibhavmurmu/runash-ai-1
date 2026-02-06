import { Badge } from "@/components/ui/badge"

export default function ModelPage() {
  const models = [
    { name: "WAN 2.1", status: "active", type: "Custom" },
    { name: "GPT-4 Vision", status: "active", type: "Open" },
    { name: "Claude 3 Opus", status: "active", type: "Open" },
    { name: "Flux Lite", status: "inactive", type: "Open" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Models</h1>
        <p className="text-muted-foreground mt-1">Manage and configure AI models</p>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Model Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model, idx) => (
              <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 text-sm">{model.name}</td>
                <td className="px-4 py-3 text-sm">{model.type}</td>
                <td className="px-4 py-3 text-sm">
                  <Badge variant={model.status === "active" ? "default" : "secondary"}>{model.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
