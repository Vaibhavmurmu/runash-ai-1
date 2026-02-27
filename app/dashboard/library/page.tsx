import type { Metadata } from "next"
import { createDashboardMetadata } from "../metadata"
import { DashboardLibraryPage } from "@/components/dashboard/library/dashboard-library-page"

export const metadata: Metadata = createDashboardMetadata({
  title: "Library",
  description: "Search and reuse shared assets, datasets, and prompts.",
  path: "/dashboard/library",
})

export default function LibraryPage() {
  return <DashboardLibraryPage />
}
