"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowRight,
  Bot,
  CreditCard,
  FolderKanban,
  Home,
  LayoutTemplate,
  Library,
  PackageSearch,
  PanelsTopLeft,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
} from "lucide-react"

type ChatPreviewMessage = {
  id: string | number
  role: "assistant" | "user"
  content: string
  created_at?: string
}

type ChatQuickPrompt = {
  id: string
  label: string
  description: string
  prompt: string
  icon: React.ComponentType<{ className?: string }>
}

type RecentItem = {
  id: string
  title: string
}

export default function RunashChatPage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messagesPreview, setMessagesPreview] = useState<ChatPreviewMessage[]>([])
  const [loadingSession, setLoadingSession] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [loadingRecents, setLoadingRecents] = useState(false)
  const [recentItemsError, setRecentItemsError] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")

  const quickPrompts: ChatQuickPrompt[] = [
    {
      id: "bundle",
      label: "Build Bundle",
      description: "Create high-conversion bundles with upsells",
      prompt: "Create a high-converting organic breakfast bundle and suggest two upsells under $30.",
      icon: ShoppingCart,
    },
    {
      id: "checkout",
      label: "Checkout Assist",
      description: "Guide payment and reduce checkout drop-off",
      prompt: "Act as checkout assistant and help complete a secure payment with cart summary and next steps.",
      icon: CreditCard,
    },
    {
      id: "order-followup",
      label: "Post-Purchase",
      description: "Handle order updates and support questions",
      prompt: "Handle a post-purchase support request: order tracking, ETA, and return options.",
      icon: PackageSearch,
    },
  ]

  useEffect(() => {
    ;(async () => {
      setLoadingRecents(true)
      setRecentItemsError(null)
      setLoadingSession(true)
      setPreviewError(null)
      try {
        const sessionsResponse = await fetch("/api/sessions")
        const sessionsPayload = await sessionsResponse.json().catch(() => null)

        if (!sessionsResponse.ok || !sessionsPayload?.success || !Array.isArray(sessionsPayload?.data)) {
          throw new Error(sessionsPayload?.error?.message || "Unable to load recent chats")
        }

        const normalizedRecentItems = sessionsPayload.data
          .map((session: { id?: string | number; title?: string }) => {
            const id = session?.id != null ? String(session.id) : ""
            const title = typeof session?.title === "string" ? session.title.trim() : ""
            if (!id) return null
            return {
              id,
              title: title || `Session #${id}`,
            }
          })
          .filter((item: RecentItem | null): item is RecentItem => item !== null)

        setRecentItems(normalizedRecentItems.slice(0, 8))
      } catch (error) {
        setRecentItemsError(error instanceof Error ? error.message : "Unable to load recent chats")
        setRecentItems([])
      } finally {
        setLoadingRecents(false)
      }

      try {
        const res = await fetch("/api/sessions/recent")
        const payload = await res.json()
        if (!res.ok || !payload?.success || !payload?.data?.id) {
          throw new Error(payload?.error?.message || "No recent session")
        }

        const recentSession = payload.data
        setSessionId(String(recentSession.id))

        const msgs = await fetch(`/api/messages/session/${recentSession.id}?limit=6`)
        if (!msgs.ok) {
          const messagePayload = await msgs.json().catch(() => null)
          throw new Error(messagePayload?.error?.message || "Unable to load message preview")
        }

        const messagePayload = await msgs.json()
        const preview = Array.isArray(messagePayload?.data) ? (messagePayload.data as ChatPreviewMessage[]) : []
        setMessagesPreview(preview)
      } catch (error) {
        setPreviewError(error instanceof Error ? error.message : "Unable to load chat preview")
        setMessagesPreview([])
      } finally {
        setLoadingSession(false)
      }
    })()
  }, [])

  function startChatWithPrompt(initialPrompt?: string) {
    ;(async () => {
      try {
        let sid = sessionId
        if (!sid) {
          const res = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "RunAsh Chat" }),
          })
          const created = await res.json()
          sid = created?.id ? String(created.id) : null
          setSessionId(sid ?? null)
        }

        const cleanPrompt = initialPrompt?.trim()
        if (cleanPrompt) {
          localStorage.setItem("runash_initial_prompt", cleanPrompt)
        }

        router.push(sid ? `/chat?sessionId=${sid}` : "/chat")
      } catch {
        router.push("/chat")
      }
    })()
  }

  return (
    <div className="min-h-screen bg-[#030405] text-zinc-100">
      <div className="mx-auto flex w-full max-w-[1400px] gap-4 px-3 py-3">
        <aside className="hidden h-[calc(100vh-24px)] w-[250px] shrink-0 rounded-xl border border-zinc-800 bg-black/70 p-3 lg:flex lg:flex-col">
          <Button className="mb-3 justify-start bg-zinc-900 hover:bg-zinc-800" onClick={() => startChatWithPrompt()}>
            <Plus className="mr-2 h-4 w-4" /> New Chat
          </Button>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
            <Input className="border-zinc-800 bg-zinc-950 pl-8 text-zinc-200" placeholder="Search" />
          </div>

          <nav className="space-y-1 text-sm">
            {[
              { label: "Home", icon: Home },
              { label: "Library", icon: Library },
              { label: "Projects", icon: FolderKanban },
              { label: "Design Systems", icon: PanelsTopLeft },
              { label: "Templates", icon: LayoutTemplate },
            ].map((item) => (
              <button key={item.label} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-zinc-300 hover:bg-zinc-900">
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-5 border-t border-zinc-800 pt-4">
            <div className="mb-2 text-xs font-medium text-zinc-500">Recents</div>
            <div className="space-y-1">
              {loadingRecents && <div className="px-2 py-1.5 text-xs text-zinc-500">Loading recent chats…</div>}
              {!loadingRecents && recentItemsError && <div className="px-2 py-1.5 text-xs text-amber-400">{recentItemsError}</div>}
              {!loadingRecents && !recentItemsError && recentItems.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-zinc-500">No recent chats yet</div>
              )}
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(`/chat?sessionId=${item.id}`)}
                  className="w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-900"
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="h-[calc(100vh-24px)] flex-1 rounded-xl border border-zinc-800 bg-[#050607] p-4 sm:p-6">
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
            <header className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 p-2">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">RunAsh Agent Workspace</p>
                  <h1 className="text-xl font-semibold">What do you want to create?</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="border-zinc-700 bg-zinc-950 text-zinc-100" onClick={() => router.push("/pricing")}>Upgrade</Button>
                <Badge variant="secondary" className="bg-zinc-800 text-zinc-200">{sessionId ? `Session #${sessionId}` : "No session"}</Badge>
              </div>
            </header>

            <Card className="mb-5 border-zinc-800 bg-zinc-950 p-4">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask RunAsh to plan a launch, bundle products, or assist checkout..."
                className="mb-3 border-zinc-700 bg-zinc-900 text-zinc-200"
              />
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => startChatWithPrompt(item.prompt)}
                      className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-zinc-800"
                    >
                      <Icon className="h-3.5 w-3.5 text-cyan-400" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <Button className="bg-cyan-600 text-white hover:bg-cyan-500" disabled={!prompt.trim()} onClick={() => startChatWithPrompt(prompt)}>
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </Card>

            <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="border-zinc-800 bg-zinc-950 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-zinc-100">Recent chats</h2>
                  <span className="text-xs text-zinc-500">View all</span>
                </div>
                <ScrollArea className="h-[260px]">
                  <div className="space-y-2 pr-2">
                    {loadingSession && <div className="text-sm text-zinc-500">Loading preview…</div>}
                    {!loadingSession && previewError && <div className="text-sm text-amber-400">{previewError}</div>}
                    {!loadingSession && !previewError && messagesPreview.length === 0 && (
                      <div className="text-sm text-zinc-500">No messages yet. Start a chat to see history.</div>
                    )}
                    {messagesPreview.map((message) => (
                      <div key={message.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-2">
                        <div className="mb-1 text-xs font-medium text-cyan-400">{message.role === "assistant" ? "RunAsh Agent" : "You"}</div>
                        <p className="line-clamp-2 text-xs text-zinc-300">{message.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              <Card className="border-zinc-800 bg-zinc-950 p-4">
                <h2 className="mb-3 text-sm font-medium text-zinc-100">Commerce assistant modes</h2>
                <ul className="space-y-2 text-sm text-zinc-300">
                  <li className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-emerald-400" /> Product discovery & bundling</li>
                  <li className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-blue-400" /> Checkout guidance</li>
                  <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-green-400" /> Safe payment handoff</li>
                  <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-orange-400" /> Personalized upsells</li>
                </ul>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-100" onClick={() => router.push("/payment/runash-pay")}>RunAsh Pay</Button>
                  <Button className="bg-zinc-100 text-zinc-900 hover:bg-white" onClick={() => startChatWithPrompt("Help me complete checkout with best payment option and order confirmation steps.")}>Launch flow</Button>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
