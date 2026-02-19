import type React from "react"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"

export const metadata: Metadata = {
  title: "RunAsh AI Agents - Live Streaming & Product Automation",
  description: "Modern AI-powered dashboard for live streaming retailing and organic product automation workflows",
  generator: "v0.dev",
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <SidebarProvider defaultOpen>{children}</SidebarProvider>
    </ThemeProvider>
  )
}
