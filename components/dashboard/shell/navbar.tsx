"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { dashboardNavItems } from "./nav-config"

interface DashboardNavbarProps {
  onOpenMobileMenu: () => void
}

export function DashboardNavbar({ onOpenMobileMenu }: DashboardNavbarProps) {
  const pathname = usePathname()

  const activeLabel = dashboardNavItems.find((item) => (item.activeMatch ? item.activeMatch(pathname) : item.href === pathname))?.label

  return (
    <header className="sticky top-0 z-30 border-b bg-card/60 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMobileMenu}>
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">Dashboard</p>
            <p className="text-sm font-semibold">{activeLabel ?? "Workspace"}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/dashboard" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block">
            Back to dashboard
          </Link>
        </div>
      </div>
    </header>
  )
}
