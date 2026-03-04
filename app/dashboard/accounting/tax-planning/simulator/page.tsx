import type { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard-shell"
import { TaxSimulator } from "@/components/tax-simulator"
import { TaxScenarioComparison } from "@/components/tax-scenario-comparison"
import { TaxSavingSuggestions } from "@/components/tax-saving-suggestions"
import { createDashboardMetadata } from "../../../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Tax Planning Simulator",
  description: "Simulate different tax scenarios to optimize your tax planning.",
  path: "/dashboard/accounting/tax-planning/simulator",
})

export default function TaxPlanningSimulatorPage() {
  return (
    <DashboardShell>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tax Planning Simulator</h1>
            <p className="text-muted-foreground">Simulate different tax scenarios to optimize your tax planning</p>
          </div>
        </div>
        <div className="grid gap-6">
          <TaxSimulator />
          <div className="grid gap-6 md:grid-cols-2">
            <TaxScenarioComparison />
            <TaxSavingSuggestions />
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
