"use client"

import { AlertCircle, CheckCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function MCPServerMonitor() {
  const mcpServers = [
    {
      id: "mcp1",
      name: "Primary Processing Server",
      status: "healthy",
      uptime: "99.9%",
      latency: "45ms",
      connections: 24,
      load: 65,
    },
    {
      id: "mcp2",
      name: "Video Generation Server",
      status: "healthy",
      uptime: "99.8%",
      latency: "62ms",
      connections: 18,
      load: 72,
    },
    {
      id: "mcp3",
      name: "Stream Coordination Server",
      status: "warning",
      uptime: "98.5%",
      latency: "120ms",
      connections: 12,
      load: 88,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Servers", value: "3", color: "text-blue-500" },
          { label: "Healthy", value: "2", color: "text-green-500" },
          { label: "Warnings", value: "1", color: "text-yellow-500" },
          { label: "Avg Latency", value: "75ms", color: "text-purple-500" },
        ].map((stat, idx) => (
          <div key={idx} className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Servers Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Server Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Uptime</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Latency</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Connections</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Load</th>
            </tr>
          </thead>
          <tbody>
            {mcpServers.map((server, idx) => (
              <tr key={server.id} className="border-b border-border hover:bg-muted/50 transition-colors last:border-0">
                <td className="px-4 py-3 text-sm">{server.name}</td>
                <td className="px-4 py-3 text-sm">
                  <Badge
                    variant={server.status === "healthy" ? "default" : "secondary"}
                    className="flex items-center gap-1 w-fit"
                  >
                    {server.status === "healthy" ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {server.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm">{server.uptime}</td>
                <td className="px-4 py-3 text-sm">{server.latency}</td>
                <td className="px-4 py-3 text-sm">{server.connections}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${server.load > 80 ? "bg-red-500" : server.load > 60 ? "bg-yellow-500" : "bg-green-500"}`}
                      style={{ width: `${server.load}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Server Details */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-4">Channel Processing Configuration</h3>
        <div className="space-y-3">
          {["YouTube", "Twitch", "TikTok", "Custom Streams"].map((channel, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm">{channel}</span>
              <select className="px-2 py-1 bg-background rounded text-xs">
                <option>Primary Server</option>
                <option>Secondary Server</option>
                <option>Tertiary Server</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
