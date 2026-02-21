"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, ChevronRight, Command, Menu, MoreHorizontal, Plus, Search } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { resolveDashboardNavContext } from "./nav-config"

interface DashboardNavbarProps {
  onOpenMobileMenu: () => void
}

export function DashboardNavbar({ onOpenMobileMenu }: DashboardNavbarProps) {
  const pathname = usePathname()
  const navContext = resolveDashboardNavContext(pathname)

  return (
    <header className="sticky top-0 z-30 border-b bg-card/60 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4 md:h-16 md:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMobileMenu}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open sidebar</span>
          </Button>
          <div>
            <p className="text-xs text-muted-foreground md:text-sm">{navContext.currentSection}</p>
            <div className="hidden items-center gap-1 text-sm font-semibold text-foreground md:flex" aria-label="Current module breadcrumb">
              {navContext.breadcrumbs.map((crumb, index) => (
                <div key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                  {crumb.href ? (
                    <Link href={crumb.href} className="transition-colors hover:text-orange-500">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                  {index < navContext.breadcrumbs.length - 1 ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="hidden w-72 justify-between text-muted-foreground lg:flex">
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search or run command...
            </span>
            <span className="rounded border px-1.5 py-0.5 text-xs">⌘K</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden md:inline-flex">
                <Plus className="mr-2 h-4 w-4" />
                Quick Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/editor/dashboard">New project</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/stream">Go live</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/runash-chat">Open chat session</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/ecommerce/dashboard">Add product</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" aria-label="Open notifications">
            <Bell className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="hidden items-center gap-2 md:inline-flex">
                <Avatar className="h-6 w-6">
                  <AvatarFallback>RA</AvatarFallback>
                </Avatar>
                <span className="text-sm">RunAsh • Main</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>User & workspace</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Switch to Creator Workspace</DropdownMenuItem>
              <DropdownMenuItem>Switch to Commerce Workspace</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard">Account settings</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open action menu">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Command className="mr-2 h-4 w-4" />
                Search / Commands
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/editor/dashboard">New project</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/stream">Go live</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/runash-chat">Open chat session</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/ecommerce/dashboard">Add product</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Notifications</DropdownMenuItem>
              <DropdownMenuItem>Switch workspace</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
