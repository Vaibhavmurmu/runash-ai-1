import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type RunAshChatTask = {
  id: string
  title: string
  prompt: string
  status: "ready" | "automation" | "checkout"
}

const RUNASH_CHAT_TASKS: RunAshChatTask[] = [
  {
    id: "buyer-task",
    title: "Buyer Agent: compare offers under budget",
    prompt: "Find a sustainable smartphone under ₹10000, compare three options, and explain price-quality trade-offs",
    status: "ready",
  },
  {
    id: "seller-task",
    title: "Seller Agent: optimize pricing + bundles",
    prompt: "Review my inventory and propose dynamic pricing, discount ladder, and bundle promotion plan for fast-moving products",
    status: "automation",
  },
  {
    id: "broker-task",
    title: "Broker Agent: match and negotiate",
    prompt: "Act as broker between supplier and retailer, negotiate best quantity-based pricing, and draft final deal summary",
    status: "automation",
  },
  {
    id: "checkout-task",
    title: "RunAsh Link: complete instant checkout",
    prompt: "Buy this item and complete Stripe Link checkout with tax preview and confirmation",
    status: "checkout",
  },
]

export function RunAshChatTaskBoard({ onRunTask }: { onRunTask: (prompt: string) => void }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-200">RunAshChat Task Board</p>
        <Badge variant="secondary" className="text-[10px]">Agentic workflow</Badge>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {RUNASH_CHAT_TASKS.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => onRunTask(task.prompt)}
            className="rounded border border-zinc-800 bg-zinc-900/70 p-2 text-left transition hover:border-orange-500"
          >
            <p className="text-xs font-medium text-zinc-100">{task.title}</p>
            <p className="mt-1 line-clamp-2 text-[11px] text-zinc-400">{task.prompt}</p>
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-zinc-300"
          onClick={() => onRunTask("Create a complete buyer-seller-broker automation workflow with instant checkout")}
        >
          Generate full workflow
        </Button>
      </div>
    </div>
  )
}
