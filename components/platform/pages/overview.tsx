import { Users, Zap, Sparkles, TrendingUp } from "lucide-react"

export default function OverviewPage() {
  const stats = [
    { label: "Total Projects", value: "24", icon: Zap, trend: "+12%" },
    { label: "Active Collaborators", value: "8", icon: Users, trend: "+2" },
    { label: "Videos Generated", value: "156", icon: Sparkles, trend: "+45" },
    { label: "Platform Uptime", value: "99.9%", icon: TrendingUp, trend: "+0.1%" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome to RunAsh AI - Your AI-powered video creation platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-xs text-primary">{stat.trend}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {["Video generation completed", "New collaborator invited", "Settings updated", "Project created"].map(
            (activity, idx) => (
              <div key={idx} className="flex items-center gap-3 pb-3 border-b border-border last:border-0">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">{activity}</span>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  )
}
