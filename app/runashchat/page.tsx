import Link from "next/link"
import { Globe, Headphones, ImageIcon, Paperclip, Search } from "lucide-react"

const quickActions = [
  { label: "Attach", icon: Paperclip },
  { label: "Search", icon: Search },
  { label: "Study", icon: Globe },
  { label: "Create image", icon: ImageIcon },
]

export default function RunAshChatLandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col bg-[#1d1f23] text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-medium text-white/95 transition hover:text-white">
          RunAshChat
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white/35 hover:bg-white/5"
          >
            Sign up for free
          </Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 pb-20">
        <h1 className="mb-8 text-center text-4xl font-medium tracking-tight text-white/95">Where should we begin?</h1>

        <div className="w-full rounded-3xl border border-white/10 bg-[#2b2d31]/95 p-4 shadow-2xl shadow-black/25">
          <Link
            href="/dashboard/chat"
            className="mb-3 block rounded-xl bg-transparent px-2 py-1 text-base text-white/70 transition hover:text-white"
          >
            Ask anything
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {quickActions.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/85 transition hover:border-white/30 hover:bg-white/5"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
            >
              <Headphones className="h-3.5 w-3.5" />
              Voice
            </button>
          </div>
        </div>
      </section>

      <p className="pb-4 text-center text-xs text-white/40">
        By using RunAshChat, you agree to our Terms and Privacy Policy.
      </p>
    </main>
  )
}
