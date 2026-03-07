import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const integrations = [
  {
    name: "Chat API (/api/chat)",
    description: "Primary streaming endpoint used by chat surfaces for model responses and tool execution events.",
  },
  {
    name: "Agent Chat API (/api/agents/chat)",
    description: "Agentic chat path for orchestrated tools and richer automation workflows.",
  },
  {
    name: "Sessions API (/api/sessions)",
    description: "Creates, lists, updates, and soft-deletes chat sessions backed by persisted storage.",
  },
  {
    name: "Attachments API (/api/chat/attachments)",
    description: "Uploads attachment metadata so chat prompts can safely include image context.",
  },
  {
    name: "Realtime Gateway",
    description: "Realtime publishers and gateway support low-latency updates across dashboard surfaces.",
  },
  {
    name: "Waitlist API (/api/waitlist)",
    description: "Captures onboarding demand with validated, duplicate-safe lead intake.",
  },
]

export default function RunashChatIntegrationsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-widest text-orange-600">RunAshChat Integrations</p>
          <h1 className="mt-2 text-3xl font-semibold">Backend and platform capabilities</h1>
          <p className="mt-2 text-muted-foreground">These integrations power real, production-oriented RunAshChat workflows.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((integration) => (
            <Card key={integration.name}>
              <CardHeader>
                <CardTitle className="text-lg">{integration.name}</CardTitle>
                <CardDescription>{integration.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Try it now</CardTitle>
            <CardDescription>Open the workspace and start a real conversation with RunAshChat.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/chat">Open RunAshChat workspace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
