import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Github, MessageSquare, ShoppingCart, Zap } from "lucide-react"

const integrations = [
  {
    name: "RunAsh",
    icon: ShoppingCart,
    description: "Connect your RunAsh store for seamless product management and order processing",
    status: "Available",
    buttonText: "Connect",
  },
  {
    name: "Discord",
    icon: MessageSquare,
    description: "Integrate with Discord for community engagement and automated notifications",
    status: "Available",
    buttonText: "Connect",
  },
  {
    name: "Zapier",
    icon: Zap,
    description: "Automate workflows with 5000+ apps through Zapier integration",
    status: "Available",
    buttonText: "Connect",
  },
  {
    name: "GitHub",
    icon: Github,
    description: "Connect GitHub for custom AI agent development and deployment",
    status: "Beta",
    buttonText: "Connect",
  },
]

export function IntegrationCards() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>Connect your favorite tools and platforms to enhance your streaming workflow</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((integration) => (
            <div key={integration.name} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <integration.icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{integration.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {integration.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{integration.description}</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                {integration.buttonText}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
