import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, CheckCircle, Clock, Wrench } from "lucide-react"

const statusItems = [
  {
    title: "STREAM OPTIMIZATION",
    status: "completed",
    icon: CheckCircle,
  },
  {
    title: "AI AGENT TRAINING",
    status: "completed",
    icon: CheckCircle,
  },
  {
    title: "WORKFLOW AUTOMATION",
    status: "in-progress",
    icon: Clock,
  },
]

export function StatusNotification() {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              <h3 className="font-semibold">Introducing RunAsh AI Pro</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Enhanced AI agents for live streaming automation and advanced product workflow management
            </p>
            <div className="flex flex-wrap gap-2">
              {statusItems.map((item, index) => (
                <Badge
                  key={index}
                  variant={item.status === "completed" ? "default" : "secondary"}
                  className="flex items-center gap-1"
                >
                  <item.icon className="h-3 w-3" />
                  {item.title}
                </Badge>
              ))}
            </div>
            <Button size="sm" className="mt-2">
              Try it out
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
