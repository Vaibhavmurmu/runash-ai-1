"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Hero from "@/components/home/hero"
import ProductCarousel from "@/components/home/products-carousel"
import AgentCard from "@/components/home/agent-card"
import CTASection from "@/components/home/cta-section"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, CreditCard, Leaf, PackageSearch, ShieldCheck, ShoppingCart, Sparkles } from "lucide-react"

type ChatPreviewMessage = {
  id: string | number
  role: "assistant" | "user"
  content: string
  created_at?: string
  message_type?: "text" | "product" | "recipe" | "tip" | "automation"
}

type ChatProduct = {
  id: string
  name: string
  price: number
  image: string
  sustainability_score: number
}

type LiveAgent = {
  id: string
  name: string
  tagline: string
  avatar: string
  online: boolean
}

type ChatQuickPrompt = {
  id: string
  label: string
  description: string
  prompt: string
  icon: React.ComponentType<{ className?: string }>
}

export default function RunashChatPage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messagesPreview, setMessagesPreview] = useState<ChatPreviewMessage[]>([])
  const [loadingSession, setLoadingSession] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [products, setProducts] = useState<ChatProduct[]>([])
  const [agents, setAgents] = useState<LiveAgent[]>([])

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
    // load recent session and preview messages
    (async () => {
      setLoadingSession(true)
      setPreviewError(null)
      try {
        const res = await fetch("/api/sessions/recent")
        const payload = await res.json()
        if (!res.ok || !payload?.success || !payload?.data?.id) {
          throw new Error(payload?.error?.message || "No recent session")
        }

        const recentSession = payload.data
        setSessionId(String(recentSession.id))

        if (recentSession?.id) {
          const msgs = await fetch(`/api/messages/session/${recentSession.id}?limit=4`)
          if (msgs.ok) {
            const messagePayload = await msgs.json()
            const preview = Array.isArray(messagePayload?.data) ? (messagePayload.data as ChatPreviewMessage[]) : []
            setMessagesPreview(preview)
          } else {
            const messagePayload = await msgs.json().catch(() => null)
            setPreviewError(messagePayload?.error?.message || "Unable to load message preview")
          }
        }
      } catch (error) {
        setPreviewError(error instanceof Error ? error.message : "Unable to load chat preview")
        setMessagesPreview([])
      } finally {
        setLoadingSession(false)
      }
    })()

    // load sample products for carousel (fallback if no API)
    ;(async () => {
      try {
        const res = await fetch("/api/products?limit=8")
        if (!res.ok) throw new Error("no products")
        const data = await res.json()
        setProducts(Array.isArray(data) ? data : [])
      } catch {
        // fallback sample
        setProducts([
          {
            id: "p-1",
            name: "Organic Quinoa",
            price: 12.99,
            image: "/placeholder.svg?height=160&width=240",
            sustainability_score: 9,
          },
          {
            id: "p-2",
            name: "Organic Avocado (2pcs)",
            price: 8.99,
            image: "/placeholder.svg?height=160&width=240",
            sustainability_score: 8,
          },
          {
            id: "p-3",
            name: "Reusable Produce Bags (5-pack)",
            price: 6.5,
            image: "/placeholder.svg?height=160&width=240",
            sustainability_score: 10,
          },
        ])
      }
    })()

    // load sample agents (could come from /api/agents)
    setAgents([
      { id: "a1", name: "Runa — Live Commerce Host", tagline: "Product discovery, live demos & upsells", avatar: "/placeholder.svg?height=96&width=96", online: true },
      { id: "a2", name: "Ash — Sustainability Expert", tagline: "Recipes, sourcing & carbon tips", avatar: "/placeholder.svg?height=96&width=96", online: false },
      { id: "a3", name: "Murmur — Retail Ops", tagline: "Inventory, pricing & automation", avatar: "/placeholder.svg?height=96&width=96", online: true },
    ])
  }, [])

  function startChatWithPrompt(initialPrompt?: string) {
    // ensure there's a session and navigate into chat with the session id
    (async () => {
      try {
        let sid = sessionId
        if (!sid) {
          const res = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Live Agent" }) })
          const created = await res.json()
          sid = created?.id ? String(created.id) : null
          setSessionId(sid ?? null)
        }

        if (initialPrompt) {
          // store in localStorage so chat page picks it up and sends immediately
          const cleanPrompt = initialPrompt.trim()
          if (cleanPrompt) {
            localStorage.setItem("runash_initial_prompt", cleanPrompt)
          }
        }

        if (sid) {
          router.push(`/chat?sessionId=${sid}`)
        } else {
          // fallback - open chat root
          router.push("/chat")
        }
      } catch (err) {
        console.error("Failed to start chat:", err)
        router.push("/chat")
      }
    })()
  }

  const relativeTime = (timestamp?: string) => {
    if (!timestamp) return "just now"

    const delta = Date.now() - new Date(timestamp).getTime()
    if (Number.isNaN(delta)) return "just now"

    const minutes = Math.max(Math.round(delta / 60000), 0)
    if (minutes < 1) return "now"
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    const days = Math.round(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-gray-950 dark:to-gray-900">
      <header className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-r from-orange-600 to-yellow-500 p-3">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-yellow-500 text-transparent bg-clip-text">
                RunAsh Live Commerce
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Agentic shopping experiences — live demos, recommendations, and checkout assist</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={() => startChatWithPrompt()} className="bg-gradient-to-r from-orange-600 to-yellow-500 text-white">
              Continue Chat
            </Button>
            <Button variant="ghost" onClick={() => router.push("/pricing")}>
              Upgrade
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <Hero
            title="Turn browsers into buyers with human-like live agents"
            subtitle="Host guided shopping sessions, demo products, recommend bundles, and convert with context-aware AI — all linked to your inventory."
            primaryAction={() => startChatWithPrompt("Start a live commerce session: show popular organic breakfast bundles and recommend upsells")}
            secondaryAction={() => startChatWithPrompt("Run a product demo for Organic Quinoa and show complementary items")}
          />

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3">Featured products</h3>
            <ProductCarousel items={products} />
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Live Agents</h3>
              <div className="text-sm text-gray-500">Hosted & AI-assisted</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {agents.map((a) => (
                <AgentCard key={a.id} agent={a} onStart={() => startChatWithPrompt(`Connect me to ${a.name} for product recommendations and live demos`)} />
              ))}
            </div>
          </Card>

          <CTASection
            title="Go agentic — scale live commerce"
            bullets={[
              "AI-powered live selling: product demos, recommendations, and checkout assistance",
              "Seamless session continuity — switch from marketing to live support without losing context",
              "Integrate with Neon DB inventory, OpenAI, and your payment provider",
            ]}
            onAction={() => router.push("/pricing")}
          />
        </section>

        <aside className="space-y-6">
          <Card className="p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold">Mini Chat Preview</h4>
                <div className="text-xs text-gray-500">ChatGPT-style continuity for commerce and payment journeys.</div>
              </div>
              <Badge variant="secondary" className="whitespace-nowrap">
                {sessionId ? `Session #${sessionId}` : "New session"}
              </Badge>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border bg-orange-50 p-2 dark:bg-gray-900">
                <div className="font-medium text-orange-700 dark:text-orange-400">Messages</div>
                <div className="text-gray-600 dark:text-gray-400">{messagesPreview.length || 0} in preview</div>
              </div>
              <div className="rounded-md border bg-green-50 p-2 dark:bg-gray-900">
                <div className="font-medium text-green-700 dark:text-green-400">Agent mode</div>
                <div className="text-gray-600 dark:text-gray-400">Commerce + payment</div>
              </div>
            </div>

            <ScrollArea className="max-h-64 rounded-md border p-3">
              <div className="space-y-2">
                {loadingSession && <div className="text-sm text-gray-500">Loading preview...</div>}
                {!loadingSession && !previewError && messagesPreview.length === 0 && <div className="text-sm text-gray-600">No messages yet — start a session to see previews</div>}
                {!loadingSession && previewError && <div className="text-sm text-amber-700 dark:text-amber-400">{previewError}</div>}
                {messagesPreview.map((m) => (
                  <div key={m.id} className={`rounded-md border p-2 text-xs ${m.role === "user" ? "bg-orange-50 dark:bg-gray-900" : "bg-white dark:bg-gray-900"}`}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className={`font-medium ${m.role === "assistant" ? "text-orange-700 dark:text-orange-400" : "text-gray-700 dark:text-gray-200"}`}>
                        {m.role === "assistant" ? "RunAsh Agent" : "You"}
                      </span>
                      <span className="text-[11px] text-gray-500">{relativeTime(m.created_at)}</span>
                    </div>
                    <p className="line-clamp-3 text-gray-700 dark:text-gray-300">{m.content}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-3 space-y-2">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-300">Quick agent prompts</div>
              <div className="grid grid-cols-1 gap-2">
                {quickPrompts.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => startChatWithPrompt(item.prompt)}
                      className="flex items-start gap-2 rounded-md border p-2 text-left transition-colors hover:bg-orange-50 dark:hover:bg-gray-900"
                    >
                      <Icon className="mt-0.5 h-4 w-4 text-orange-500" />
                      <div>
                        <div className="text-xs font-medium">{item.label}</div>
                        <div className="text-[11px] text-gray-500">{item.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask the agent something..." />
              <Button
                onClick={() => {
                  const cleanPrompt = prompt.trim()
                  if (!cleanPrompt) return
                  localStorage.setItem("runash_initial_prompt", cleanPrompt)
                  startChatWithPrompt(cleanPrompt)
                }}
                disabled={!prompt.trim()}
                className="bg-gradient-to-r from-orange-600 to-yellow-500 text-white"
              >
                Ask & Continue
              </Button>
            </div>

            <div className="mt-3 text-xs text-gray-500 flex gap-3">
              <span className="flex items-center"><Leaf className="h-3 w-3 mr-1 text-green-500" /> Organic Focus</span>
              <span className="flex items-center"><Sparkles className="h-3 w-3 mr-1 text-orange-500" /> Agentic AI</span>
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="mb-2 font-semibold">Commerce Agent Playbook</h4>
            <ul className="mb-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-green-500" /> Secure handoff for payment and order assistance</li>
              <li className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-orange-500" /> Context-aware product recommendations and bundles</li>
              <li className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-blue-500" /> Checkout help with guided next actions</li>
            </ul>
            <div className="flex gap-2">
              <Button variant="outline" className="w-full" onClick={() => router.push("/payment/runash-pay")}>Open RunAsh Pay</Button>
              <Button className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 text-white" onClick={() => startChatWithPrompt("Help me complete checkout with best payment option and order confirmation steps.")}>Launch Agent Flow</Button>
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-semibold mb-2">Why RunAsh for Live Commerce?</h4>
            <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
              <li>Convert with guided shopping flows</li>
              <li>Reduce returns with live product education</li>
              <li>Boost AOV with context-aware upsells</li>
            </ul>
          </Card>
        </aside>
      </main>
    </div>
  )
}
