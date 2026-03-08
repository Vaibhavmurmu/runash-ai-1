import { ChevronDown, Globe, Grid2X2, Home, List, MessageSquare, Plus, Search, Sparkles, Wallet, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const primaryNavigation = [
  { label: "Home", icon: Home, active: true },
  { label: "Projects", icon: Grid2X2 },
  { label: "Chats", icon: MessageSquare },
  { label: "Design Systems", icon: List },
  { label: "Templates", icon: Grid2X2 },
]

export function RunAshChatMainInterface() {
  return (
    <div className="flex h-[calc(100vh-8rem)] w-full overflow-hidden rounded-xl border bg-[#f4f4f5] shadow-sm">
      <aside className="hidden w-[260px] shrink-0 border-r bg-[#f6f6f7] lg:flex lg:flex-col">
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-700 text-[10px] text-white">R</span>
            <span>Personal</span>
            <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-600">Free</span>
          </div>
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        </div>

        <div className="px-3">
          <Button variant="outline" className="h-9 w-full justify-between rounded-md border-zinc-300 bg-white text-zinc-700">
            New Chat
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-3 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input className="h-8 border-zinc-300 bg-white pl-9 text-sm" placeholder="Search" />
          </div>
        </div>

        <nav className="space-y-1 px-2">
          {primaryNavigation.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-zinc-600 transition hover:bg-zinc-200/70",
                  item.active && "bg-zinc-200 text-zinc-900",
                )}
                key={item.label}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="mt-6 space-y-3 px-3 text-xs text-zinc-500">
          <button className="flex w-full items-center justify-between py-1 text-left" type="button">
            Favorites
            <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
          </button>
          <button className="flex w-full items-center justify-between py-1 text-left" type="button">
            Recents
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <div className="rounded-md border border-dashed border-zinc-300 px-3 py-4 text-center text-[11px] leading-4 text-zinc-400">
            You haven't created any
            <br />
            chats yet.
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center justify-end gap-2 border-b bg-[#f6f6f7] px-4">
          <Button variant="outline" size="sm" className="h-8 border-zinc-300 bg-white text-xs text-zinc-700">
            Upgrade
          </Button>
          <div className="inline-flex h-8 items-center rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-700">
            <Wallet className="mr-1 h-3.5 w-3.5" /> 5.00
          </div>
          <button className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-700 text-white" type="button">
            <Globe className="h-3.5 w-3.5" />
          </button>
        </header>

        <main className="relative flex flex-1 items-center justify-center bg-[#f3f3f4] p-4 md:p-8">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white/60 p-4 shadow-sm backdrop-blur-sm md:p-5">
            <h1 className="mb-4 text-center text-3xl font-semibold tracking-tight text-zinc-900">What do you want to create?</h1>

            <div className="rounded-xl border border-zinc-200 bg-white">
              <Input
                className="h-11 rounded-b-none rounded-t-xl border-0 border-b border-zinc-200 bg-transparent px-4 text-sm shadow-none focus-visible:ring-0"
                placeholder="Ask RunAshChat to build..."
              />

              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2 text-zinc-500">
                  <button className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100" type="button">
                    <Plus className="h-4 w-4" />
                  </button>
                  <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-zinc-100" type="button">
                    <Sparkles className="h-3.5 w-3.5" />
                    v0 Mini
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100" type="button">
                    Project <ChevronDown className="inline h-3 w-3" />
                  </button>
                  <button className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white" type="button">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-500">
              <span>Upgrade to Team to unlock all of RunAshChat's features and more credits</span>
              <button className="font-medium text-emerald-600" type="button">
                Upgrade Plan
              </button>
              <button className="text-zinc-400" type="button">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </main>
      </section>
    </div>
  )
}
