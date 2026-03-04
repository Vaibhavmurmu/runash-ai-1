"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

type LiveSession = {
  id: string
  title: string
  status: "active" | "ended"
}

type TranscriptItem = {
  from: "seller" | "assistant"
  text: string
  fallbackUsed?: boolean
}

export function AiLiveChatPanel() {
  const { toast } = useToast()
  const [title, setTitle] = useState("New buyer consult")
  const [session, setSession] = useState<LiveSession | null>(null)
  const [message, setMessage] = useState("")
  const [transcript, setTranscript] = useState<TranscriptItem[]>([])
  const [loading, setLoading] = useState(false)

  async function createSession() {
    setLoading(true)
    try {
      const response = await fetch("/api/seller/live-chat/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      })

      const payload = await response.json()
      if (!response.ok || !payload?.data?.session) throw new Error(payload?.error?.message ?? "Unable to create session")
      setSession(payload.data.session)
      setTranscript([])
      toast({ title: "Session started", description: "Live AI session created and seller joined." })
    } catch (error: any) {
      toast({ title: "Session error", description: error?.message ?? "Unable to create session", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function askAssistant() {
    if (!session || !message.trim()) return
    const outbound = message.trim()
    setLoading(true)
    setTranscript((current) => [...current, { from: "seller", text: outbound }])
    setMessage("")

    try {
      const response = await fetch(`/api/seller/live-chat/session/${session.id}/assistant-message`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "seller", message: outbound }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message ?? "Assistant unavailable")

      setTranscript((current) => [
        ...current,
        { from: "assistant", text: payload.data.reply, fallbackUsed: payload.data.fallbackUsed },
      ])
    } catch (error: any) {
      toast({ title: "Assistant message failed", description: error?.message ?? "Try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function endSession() {
    if (!session) return
    setLoading(true)
    try {
      const response = await fetch(`/api/seller/live-chat/session/${session.id}/end`, {
        method: "POST",
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message ?? "Unable to end session")
      setSession(payload.data.session)
      toast({ title: "Session ended", description: "Live chat session closed and telemetry finalized." })
    } catch (error: any) {
      toast({ title: "End session failed", description: error?.message ?? "Try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>AI Live Chat</CardTitle>
          <CardDescription>Seller, buyer, and AI assistant turn-taking with telemetry-ready session events.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Session title" />
            <Button onClick={createSession} disabled={loading || !!session?.id && session.status === "active"}>
              Start Session
            </Button>
            <Button variant="outline" onClick={endSession} disabled={loading || !session || session.status === "ended"}>
              End Session
            </Button>
          </div>
          {session && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={session.status === "active" ? "default" : "secondary"}>{session.status}</Badge>
              <span className="text-muted-foreground">Session ID: {session.id}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assistant Turn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Type seller or buyer context for AI assistant guidance"
            rows={4}
          />
          <Button onClick={askAssistant} disabled={loading || !session || session.status !== "active"}>
            Send to Assistant
          </Button>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {transcript.map((item, idx) => (
              <div key={`${idx}-${item.from}`} className="rounded border p-3 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium capitalize">{item.from}</span>
                  {item.fallbackUsed && <Badge variant="secondary">Fallback</Badge>}
                </div>
                <p className="text-muted-foreground">{item.text}</p>
              </div>
            ))}
            {!transcript.length && <p className="text-sm text-muted-foreground">No conversation turns yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
