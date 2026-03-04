import type { Metadata } from "next"
import { TopLevelModulePage } from "@/components/dashboard/top-level-module-page"

export const metadata: Metadata = {
  title: "Workflows Module | RunAsh AI",
  description: "Top-level workflows module for advanced execution paths.",
}

export default function WorkflowsPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <TopLevelModulePage
        title="Workflows"
        summary="Handle advanced execution paths in dedicated pages while keeping this landing page focused."
        ctaLabel="Open workflow builder"
        ctaHref="/dashboard/editor"
        secondaryLinks={[
          { label: "Streaming studio", href: "/dashboard/streaming-studio" },
          { label: "Seller studio", href: "/dashboard/seller-studio" },
          { label: "Store operations", href: "/dashboard/store" },
        ]}
      />
    </div>
  )
}
