import { getSql } from "@/lib/db/neon"
import { recalculateInventoryRecommendations } from "@/services/ai-inventory-automation-service"

const STARTED_KEY = "__runash_inventory_automation_scheduler_started__"
const INTERVAL_KEY = "__runash_inventory_automation_scheduler_interval__"

function schedulerState() {
  return globalThis as Record<string, unknown>
}

async function runForecastRecalculationJob() {
  const sql = getSql()
  const sellers = (await sql/* sql */`
    SELECT DISTINCT user_id
    FROM public.products
    WHERE user_id IS NOT NULL
  `) as Array<{ user_id: number }>

  await Promise.allSettled(
    sellers.map((seller) =>
      recalculateInventoryRecommendations(Number(seller.user_id), {
        reason: "scheduled_job",
        initiatedBy: null,
      }),
    ),
  )
}

export function startInventoryAutomationScheduler() {
  const state = schedulerState()
  if (state[STARTED_KEY]) return

  state[STARTED_KEY] = true
  const intervalHandle = setInterval(() => {
    void runForecastRecalculationJob().catch(() => {
      // Intentionally swallow scheduler errors to avoid crashing process-level jobs.
    })
  }, 30 * 60 * 1000)

  state[INTERVAL_KEY] = intervalHandle
}
