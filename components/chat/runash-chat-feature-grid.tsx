import { Bot, Mic, ShoppingCart, Store, Handshake } from "lucide-react"

type FeatureItem = {
  id: string
  title: string
  description: string
  prompt: string
  icon: typeof Bot
}

const FEATURE_ITEMS: FeatureItem[] = [
  {
    id: "buyer",
    title: "Buyer Agent",
    description: "Search, compare, negotiate discounts, and shortlist best-fit products.",
    prompt: "Act as buyer agent and find the best sustainable product options under my budget",
    icon: ShoppingCart,
  },
  {
    id: "seller",
    title: "Seller Agent",
    description: "Optimize pricing, inventory, and promotional bundles for conversions.",
    prompt: "Act as seller agent and optimize my pricing, inventory, and bundle offers",
    icon: Store,
  },
  {
    id: "broker",
    title: "Broker Agent",
    description: "Facilitate supplier-retailer deals with policy-safe negotiation.",
    prompt: "Act as broker agent and mediate a supplier-retailer deal with best final terms",
    icon: Handshake,
  },
  {
    id: "checkout",
    title: "Instant Checkout",
    description: "Use natural language like 'buy this' to trigger RunAsh Link checkout.",
    prompt: "Buy this item now using instant checkout",
    icon: Bot,
  },
  {
    id: "voice",
    title: "Voice Commerce",
    description: "Drive live shopping flows with voice-first interactions.",
    prompt: "Create a voice-first live commerce flow for product discovery and checkout",
    icon: Mic,
  },
]

export function RunAshChatFeatureGrid({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      {FEATURE_ITEMS.map((feature) => {
        const Icon = feature.icon
        return (
          <button
            key={feature.id}
            type="button"
            onClick={() => onSelect(feature.prompt)}
            className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2 text-left transition hover:border-orange-500"
          >
            <div className="mb-1 flex items-center gap-1.5 text-zinc-100">
              <Icon className="h-3.5 w-3.5 text-orange-400" />
              <p className="text-xs font-medium">{feature.title}</p>
            </div>
            <p className="text-[11px] text-zinc-400 line-clamp-2">{feature.description}</p>
          </button>
        )
      })}
    </div>
  )
}
