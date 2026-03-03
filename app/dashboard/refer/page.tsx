import type { Metadata } from "next"
import { ReferPageClient } from "@/components/dashboard/refer-page-client"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Refer & Earn",
  description: "Invite new users and track referral conversions from your workspace.",
  path: "/dashboard/refer",
})

export default function ReferPage() {
  return <ReferPageClient />
}
