"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Bot, Database, MessageSquare, PlugZap, Rocket, Workflow } from "lucide-react"
import { waitlistJoinSchema } from "@/lib/validations/waitlist"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type LandingMetrics = {
  sessions: number
  messages: number
  toolEvents: number
  activeIntegrations: number
}

type WaitlistForm = {
  email: string
  name: string
  useCase: string
}

const INTEGRATIONS = [
  { name: "RunAsh Chat API", description: "Streams responses and tool events for production chat UX." },
  { name: "MCP Connectors", description: "Connect internal tools and external data sources to AI workflows." },
  { name: "Agent Tooling", description: "Model + tool orchestration for operational and commerce actions." },
  { name: "Chat Attachments", description: "Image-aware prompting with storage-backed attachment metadata." },
  { name: "Session Persistence", description: "Database-backed sessions/messages with soft-delete and audit support." },
  { name: "Auth & Access", description: "Session-scoped chat access from authenticated RunAsh users." },
]

const INITIAL_FORM: WaitlistForm = { email: "", name: "", useCase: "" }

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)
}

export function RunashChatLanding() {
  const [form, setForm] = useState<WaitlistForm>(INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<LandingMetrics | null>(null)

  useEffect(() => {
    void fetch("/api/runash-chat/landing")
      .then((response) => response.json())
      .then((payload) => {
        const data = payload?.data
        if (!data) return
        setMetrics({
          sessions: Number(data.sessions) || 0,
          messages: Number(data.messages) || 0,
          toolEvents: Number(data.toolEvents) || 0,
          activeIntegrations: Number(data.activeIntegrations) || INTEGRATIONS.length,
        })
      })
      .catch(() => {
        setMetrics(null)
      })
  }, [])

  const metricCards = useMemo(
    () => [
      { label: "Chat Sessions", value: metrics ? formatCompact(metrics.sessions) : "Live" },
      { label: "Messages Processed", value: metrics ? formatCompact(metrics.messages) : "Streaming" },
      { label: "Tool Executions", value: metrics ? formatCompact(metrics.toolEvents) : "Agentic" },
      { label: "Active Integrations", value: String(metrics?.activeIntegrations ?? INTEGRATIONS.length) },
    ],
    [metrics],
  )

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const validation = waitlistJoinSchema.safeParse(form)
    if (!validation.success) {
      setErrorMessage("Please add a valid email and try again.")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      })

      const payload = await response.json()
      if (!response.ok) {
        setErrorMessage(payload?.error?.message ?? payload?.message ?? "Unable to join waitlist right now.")
        return
      }

      setSuccessMessage(payload?.data?.message ?? "You’re on the waitlist.")
      setForm(INITIAL_FORM)
    } catch {
      setErrorMessage("Unable to join waitlist right now.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white px-4 py-16 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300">RunAshChat</Badge>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white md:text-5xl">A real AI chat app with backend, data, and integrations.</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            RunAshChat now ships with session persistence, API routes, tool streaming, waitlist onboarding, and integration-ready architecture for real
            production workflows.
          </p>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {metricCards.map((metric) => (
              <Card key={metric.label} className="border-orange-100 dark:border-orange-900/40">
                <CardContent className="p-4">
                  <p className="text-xl font-semibold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { icon: <MessageSquare className="h-4 w-4" />, title: "Live Chat UX", copy: "Streaming responses, session history, and tool diagnostics." },
              { icon: <Database className="h-4 w-4" />, title: "Database-backed", copy: "Chat sessions/messages are persisted for continuity and audit." },
              { icon: <PlugZap className="h-4 w-4" />, title: "Integration-ready", copy: "MCP + tools connect workflows across product surfaces." },
              { icon: <Workflow className="h-4 w-4" />, title: "Automation-first", copy: "Tool events support fulfillment, content, and operations flows." },
            ].map((feature) => (
              <Card key={feature.title} className="border-orange-100 dark:border-orange-900/40">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {feature.icon}
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.copy}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-gradient-to-r from-orange-600 to-yellow-500 text-white">
              <Link href="/dashboard/chat">
                Open Chat Workspace <Rocket className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/runash-chat/integrations">
                View Integrations <Bot className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <aside>
          <Card className="border-orange-200/70 dark:border-orange-900/50">
            <CardHeader>
              <CardTitle>Get early access to RunAshChat</CardTitle>
              <CardDescription>Join the waitlist and share your use-case for priority onboarding.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="you@company.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="useCase">Use case</Label>
                  <Textarea
                    id="useCase"
                    value={form.useCase}
                    onChange={(event) => setForm((current) => ({ ...current, useCase: event.target.value }))}
                    placeholder="What do you want to automate with chat?"
                    rows={4}
                  />
                </div>

                {successMessage ? <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{successMessage}</p> : null}
                {errorMessage ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p> : null}

                <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 text-white">
                  {isSubmitting ? "Submitting..." : "Join waitlist"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="mt-4 border-orange-100 dark:border-orange-900/40">
            <CardHeader>
              <CardTitle className="text-base">Included integrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {INTEGRATIONS.slice(0, 3).map((integration) => (
                <div key={integration.name}>
                  <p className="text-sm font-medium">{integration.name}</p>
                  <p className="text-xs text-muted-foreground">{integration.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}
