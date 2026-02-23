"use client"

import { useState, type ComponentType, type MouseEvent } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, LogOut, X } from "lucide-react"
import { signOutWithRedirect, useAuthSession } from "@/lib/auth/access-client"
import { useDashboardModelDialog } from "@/components/dashboard/model-dialog-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { applySidebarRouteGuards } from "@/lib/navigation/sidebar-route-guards"
import { isNavItemActive, type DashboardNavItemMetadata, type DashboardNavSection, type DashboardNavigationConfig } from "./dashboard-nav-config"

const navSectionOrder: DashboardNavSection[] = ["core", "studio", "intelligence", "operations", "account"]

const navSectionLabel: Record<DashboardNavSection, string> = {
  core: "Core",
  studio: "Studio",
  intelligence: "Intelligence",
  operations: "Operations",
  account: "Account",
}

const knownSidebarRoutes = new Set([
  "/dashboard",
  "/stream",
  "/schedule",
  "/analytics",
  "/upload",
  "/recordings",
  "/alerts",
  "/settings",
  "/automation",
  "/runash-chat",
  "/editor",
  "/seller/dashboard",
  "/ecommerce/dashboard",
])

const sidebarRouteGuards = {
  "/agents/dashboard": { featureFlag: "sidebar_ai_agents", unavailableBehavior: "disable" as const },
  "/ecommerce/dashboard": { featureFlag: "sidebar_store", unavailableBehavior: "hide" as const },
}

interface DashboardSidebarProps {
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
  navConfig: DashboardNavigationConfig
}

interface NavLinkProps {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  isActive: boolean
  badge?: string
  metadata?: DashboardNavItemMetadata
  onClick?: () => void
  onAction?: (event: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  tooltip?: string
}

function NavLink({ href, label, icon: Icon, isActive, badge, metadata, onClick, onAction, disabled = false, tooltip }: NavLinkProps) {
  const metadataBadgeCount = typeof metadata?.badgeCount === "number" && metadata.badgeCount > 0 ? metadata.badgeCount.toString() : undefined
  const badgeLabel = metadataBadgeCount ?? badge
  const quickActionIconClassName = isActive ? "h-3.5 w-3.5 text-orange-500 dark:text-orange-300" : "h-3.5 w-3.5 text-muted-foreground"
  const QuickActionIcon = metadata?.quickActionIcon
  const statusChip = metadata?.statusChip?.toUpperCase()

  const className =
    isActive
      ? "flex items-center gap-3 rounded-lg border border-orange-500/20 bg-orange-100/70 px-3 py-2.5 text-sm font-medium text-orange-950 shadow-sm transition-all dark:border-orange-400/30 dark:bg-orange-500/15 dark:text-orange-100"
      : "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:border-border/70 hover:bg-card/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"

  if (disabled) {
    return (
      <div
        aria-disabled="true"
        className="flex items-center gap-3 rounded-lg border border-dashed border-border/70 px-3 py-2.5 text-sm font-medium text-muted-foreground/60"
        title={tooltip}
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1">{label}</span>
        {statusChip ? <Badge variant="outline">{statusChip}</Badge> : null}
        {badgeLabel ? <Badge variant="outline">{badgeLabel}</Badge> : null}
        {QuickActionIcon ? <QuickActionIcon className={quickActionIconClassName} aria-hidden="true" /> : null}
      </div>
    )
  }

  if (onAction) {
    return (
      <Button variant="ghost" className={className} onClick={onAction}>
        <Icon className={isActive ? "h-4 w-4 text-orange-500 dark:text-orange-300" : "h-4 w-4"} />
        <span className="flex-1 text-left">{label}</span>
        {statusChip ? <Badge variant="outline">{statusChip}</Badge> : null}
        {badgeLabel ? <Badge className={isActive ? "bg-orange-500 text-white dark:bg-orange-400 dark:text-orange-950" : ""}>{badgeLabel}</Badge> : null}
        {QuickActionIcon ? <QuickActionIcon className={quickActionIconClassName} aria-hidden="true" /> : null}
      </Button>
    )
  }

  return (
    <Link
      href={href}
      className={className}
      onClick={onClick}
    >
      <Icon className={isActive ? "h-4 w-4 text-orange-500 dark:text-orange-300" : "h-4 w-4"} />
      <span className="flex-1">{label}</span>
      {statusChip ? <Badge variant="outline">{statusChip}</Badge> : null}
      {badgeLabel ? <Badge className={isActive ? "bg-orange-500 text-white dark:bg-orange-400 dark:text-orange-950" : ""}>{badgeLabel}</Badge> : null}
      {QuickActionIcon ? <QuickActionIcon className={quickActionIconClassName} aria-hidden="true" /> : null}
    </Link>
  )
}

function UserCard({ mobile = false }: { mobile?: boolean }) {
  const { data: session } = useAuthSession()
  const user = session?.user

  return (
    <div className={mobile ? "border-t border-border/70 p-4" : "px-3 py-2"}>
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/70 p-3 backdrop-blur-sm">
        <Avatar>
          {user?.image ? (
            <AvatarImage src={user.image} />
          ) : (
            <>
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-gradient-to-r from-orange-500 to-amber-400 text-white">
                {user?.name ? user.name.split(" ").map((name) => name[0]).slice(0, 2).join("") : "JS"}
              </AvatarFallback>
            </>
          )}
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user?.name ?? "Guest User"}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email ?? "guest@runash.ai"}</p>
        </div>

        <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted/70" onClick={() => signOutWithRedirect("/")}>
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Sign out</span>
        </Button>
      </div>
    </div>
  )
}

function SidebarContents({ navConfig, onNavigate }: { navConfig: DashboardNavigationConfig; onNavigate?: () => void }) {
  const pathname = usePathname()
  const { openFromTrigger } = useDashboardModelDialog()
  const guardedItems = applySidebarRouteGuards(navConfig.items, {
    knownRoutes: knownSidebarRoutes,
    featureFlags: {
      sidebar_ai_agents: process.env.NEXT_PUBLIC_FEATURE_SIDEBAR_AI_AGENTS !== "false",
      sidebar_store: process.env.NEXT_PUBLIC_FEATURE_SIDEBAR_STORE !== "false",
    },
    routeGuards: sidebarRouteGuards,
  })
  const guardedItemsByHref = new Map(guardedItems.map((item) => [item.href, item]))

  const navItemsBySection = navSectionOrder
    .map((section) => ({
      section,
      label: navSectionLabel[section],
      items: guardedItems.filter((item) => item.section === section),
    }))
    .filter((group) => group.items.length > 0)

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
    <div className="mt-6 flex flex-1 flex-col gap-4 px-3">
      <section className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace</p>
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/50 p-2">
        {navItemsBySection.map((group) => (
          <div key={group.section} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/90">{group.label}</p>
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                badge={item.badge}
                metadata={item.metadata}
                isActive={isNavItemActive(pathname, item)}
                onClick={onNavigate}
                disabled={item.routeAvailability === "disabled"}
                tooltip={item.tooltip}
                onAction={
                  item.actionId === "open-model-dialog"
                    ? (event) => {
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
                              prompt: `Configure routing rules and model strategy for ${pathname}.`,
                            },
                          },
                          event.currentTarget,
                        )
                        onNavigate?.()
                      }
                    : undefined
                }
              />
            ))}
          </div>
        ))}
        </div>
      </section>

      <Separator className="bg-border/70" />

      <section className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick links</p>
        <div className="space-y-1 rounded-xl border border-border/60 bg-background/40 p-2">
        {navConfig.quickLinkGroups.map((group) => {
          const groupIsActive = group.items.some((item) => isNavItemActive(pathname, item))

          return (
            <Collapsible key={group.label} defaultOpen={groupIsActive}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="group w-full justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground"
                >
                  <span className="flex items-center gap-3">
                    <group.icon className="h-4 w-4" />
                    {group.label}
                  </span>
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pt-1.5">
                {group.items.map((item) => {
                  const guardedItem = guardedItemsByHref.get(item.href)

                  if (!guardedItem) {
                    return null
                  }

                  return (
                    <div key={item.href} className="pl-3">
                      <NavLink
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        badge={item.badge}
                        metadata={guardedItem.metadata}
                        isActive={isNavItemActive(pathname, guardedItem)}
                        onClick={onNavigate}
                        disabled={guardedItem.routeAvailability === "disabled"}
                        tooltip={guardedItem.tooltip}
                      />
                    </div>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          )
        })}
        </div>
      </section>
    </div>
  )
}

export function DashboardSidebar({ mobileOpen, onMobileOpenChange, navConfig }: DashboardSidebarProps) {
  const [logoAvailable, setLogoAvailable] = useState(true)

  return (
    <>
      <aside className="fixed inset-y-0 hidden w-64 flex-col border-r border-border/70 bg-card/55 pt-6 backdrop-blur-xl md:flex dark:bg-card/35">
        <div className="flex items-center px-4">
          {logoAvailable ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo.svg" alt="RunAsh" className="h-8 w-8 rounded-full" onError={() => setLogoAvailable(false)} />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-400 font-bold text-white">
              R
            </div>
          )}
          <Link href="/" className="ml-2 text-xl font-semibold tracking-tight text-transparent bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text">
            RunAsh
          </Link>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto">
          <SidebarContents navConfig={navConfig} />
          <div className="mt-auto pb-4">
            <Separator className="my-4 bg-border/70" />
            <UserCard />
          </div>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-64 border-r border-border/70 bg-card/95 p-0 backdrop-blur-xl md:hidden dark:bg-card/90">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border/70 p-4">
              <div className="flex items-center">
                {logoAvailable ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/logo.svg" alt="RunAsh" className="h-8 w-8 rounded-full" onError={() => setLogoAvailable(false)} />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-400 font-bold text-white">
                    R
                  </div>
                )}
                <Link href="/" className="ml-2 text-xl font-semibold tracking-tight text-transparent bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text">
                  RunAsh
                </Link>
              </div>

              <Button variant="ghost" size="icon" onClick={() => onMobileOpenChange(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <SidebarContents navConfig={navConfig} onNavigate={() => onMobileOpenChange(false)} />
            </div>

            <UserCard mobile />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
