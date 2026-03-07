import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Dashboard Module | RunAsh AI",
  description: "Top-level dashboard module with streamlined summary, CTA, and recent activity.",
}

export default function Page() {
  redirect("/dashboard/chat")
}
