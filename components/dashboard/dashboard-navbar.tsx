"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, ChevronRight, Command, Menu, MoreHorizontal, Plus, Search } from "lucide-react"
import { signOut } from "@/lib/auth/client"
import { useDashboardModelDialog } from "@/components/dashboard/model-dialog-provider"
import { FeedbackModal } from "@/components/dashboard/feedback-modal"
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
import { resolveDashboardNavContext, type DashboardNavigationConfig } from "./dashboard-nav-config"

interface DashboardNavbarProps {
  onOpenMobileMenu: () => void
  navConfig: DashboardNavigationConfig
}

export function DashboardNavbar({ onOpenMobileMenu, navConfig }: DashboardNavbarProps) {
  const pathname = usePathname()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const navContext = resolveDashboardNavContext(pathname)
  const currentPageTitle = navContext.breadcrumbs[navContext.breadcrumbs.length - 1]?.label ?? "Dashboard"
  const { openFromTrigger } = useDashboardModelDialog()

  const triggerSource = pathname.startsWith("/editor")
    ? "editor"
    : pathname.startsWith("/seller")
      ? "seller"
      : pathname.startsWith("/ecommerce")
        ? "store"
        : pathname.startsWith("/stream") || pathname.startsWith("/dashboard/streams")
          ? "streaming"
          : "chat"

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-card/70 backdrop-blur-xl dark:bg-card/50">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMobileMenu}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open sidebar</span>
          </Button>
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:text-xs">{navContext.currentSection}</p>
            <p className="text-sm font-semibold text-foreground md:hidden">{currentPageTitle}</p>
            <div className="hidden items-center gap-1 text-sm font-medium text-foreground md:flex" aria-label="Current module breadcrumb">
              {navContext.breadcrumbs.map((crumb, index) => (
                <div key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                  {crumb.href ? (
                    <Link href={crumb.href} className="rounded-sm transition-colors hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-semibold">{crumb.label}</span>
                  )}
                  {index < navContext.breadcrumbs.length - 1 ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <Button variant="outline" className="hidden h-10 w-72 justify-between border-border/80 bg-background/80 text-muted-foreground transition-colors hover:bg-card lg:flex">
            <span className="flex items-center gap-2 text-sm">
              <Search className="h-4 w-4" />
              Search or run command...
            </span>
            <span className="rounded border border-border/80 px-1.5 py-0.5 text-xs">⌘K</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden h-10 border-border/80 bg-background/75 transition-colors hover:bg-card md:inline-flex">
                <Plus className="mr-2 h-4 w-4" />
                Quick Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(event) => {
                  openFromTrigger(
                    {
                      triggerSource,
                      mode: "configure",
                      model: {
                        modelId: "runash-router",
                        provider: "RunAsh AI",
                        displayName: "RunAsh Model Router",
                      },
                      payload: {
                        prompt: `Open model controls from ${navContext.currentSection}.`,
                      },
                    },
                    event.currentTarget,
                  )
                }}
              >
                Open AI Model Dialog
              </DropdownMenuItem>
              {navConfig.quickActions.map((action) => (
                <DropdownMenuItem asChild key={action.href}>
                  <Link href={action.href}>{action.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg transition-colors hover:bg-card" aria-label="Open notifications">
            <Bell className="h-4 w-4" />
          </Button>

          <Button asChild size="sm" className="hidden h-10 md:inline-flex">
            <Link href="/settings/billing">Upgrade</Link>
          </Button>

          <Button variant="outline" size="sm" className="hidden h-10 border-border/80 bg-background/75 md:inline-flex" onClick={() => setFeedbackOpen(true)}>
            Feedback
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="hidden h-10 items-center gap-2 border-border/80 bg-background/75 transition-colors hover:bg-card md:inline-flex">
                <Avatar className="h-6 w-6">
                  <AvatarFallback>RA</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">RunAsh • Main</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/billing">Billing</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        window.location.href = "/"
                      },
                    },
                  })
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg md:hidden" aria-label="Open action menu">
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
              <DropdownMenuItem
                onClick={(event) => {
                  openFromTrigger(
                    {
                      triggerSource,
                      mode: "configure",
                      model: {
                        modelId: "runash-router",
                        provider: "RunAsh AI",
                        displayName: "RunAsh Model Router",
                      },
                      payload: {
                        prompt: `Open model controls from ${navContext.currentSection}.`,
                      },
                    },
                    event.currentTarget,
                  )
                }}
              >
                Open AI Model Dialog
              </DropdownMenuItem>
              {navConfig.quickActions.map((action) => (
                <DropdownMenuItem asChild key={action.href}>
                  <Link href={action.href}>{action.label}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/billing">Upgrade</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFeedbackOpen(true)}>Feedback</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/billing">Billing</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>Notifications</DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        window.location.href = "/"
                      },
                    },
                  })
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />
        </div>
      </div>

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </header>
  )
}
