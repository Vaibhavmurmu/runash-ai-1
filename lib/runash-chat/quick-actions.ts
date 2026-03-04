import type { QuickAction } from "@/types/runash-chat"

type BuildQuickActionsInput = {
  onPrompt: (prompt: string) => void
  onSearch: (prompt: string) => void
  openModelConfigurator: (trigger?: HTMLElement | null) => void
}

export function buildRunAshChatQuickActions(input: BuildQuickActionsInput): QuickAction[] {
  return [
    {
      id: "buyer-agent-search",
      label: "Buyer Agent Search",
      icon: "search",
      action: () =>
        input.onPrompt(
          "Find a sustainable smartphone under ₹10000 and compare top options by battery, warranty, and lifecycle score",
        ),
      category: "search",
    },
    {
      id: "seller-agent-optimize",
      label: "Seller Pricing AI",
      icon: "zap",
      action: () =>
        input.onPrompt(
          "Optimize pricing for my top 10 SKUs, suggest a bundle promotion, and identify low-stock items needing restock",
        ),
      category: "automation",
    },
    {
      id: "broker-agent-match",
      label: "Broker Match Deal",
      icon: "sparkles",
      action: () =>
        input.onPrompt(
          "Act as broker agent: match buyers with suitable sellers, negotiate best offer, and summarize the final deal",
        ),
      category: "automation",
    },
    {
      id: "live-commerce-session",
      label: "Live Commerce Script",
      icon: "leaf",
      action: () =>
        input.onPrompt(
          "Create a live commerce product showcase script with discovery, objections handling, and conversion call-to-action",
        ),
      category: "automation",
    },
    {
      id: "instant-checkout",
      label: "Instant Checkout",
      icon: "zap",
      action: () => input.onPrompt("Buy this now using RunAsh Link instant checkout"),
      category: "product",
    },
    {
      id: "web-product-search",
      label: "Web Product Search",
      icon: "search",
      action: () => input.onSearch("Search eco-friendly organic pantry bundles under $30 with best active discounts"),
      category: "search",
    },
    {
      id: "model-assist",
      label: "Model Assist",
      icon: "zap",
      action: (trigger) => input.openModelConfigurator(trigger),
      category: "automation",
    },
  ]
}
