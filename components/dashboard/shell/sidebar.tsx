"use client"

import { useState, type ComponentType } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, X } from "lucide-react"
import { signOutWithRedirect, useAuthSession } from "@/lib/auth/access-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { getNavItemsBySection, isNavItemActive } from "./nav-config"

interface DashboardSidebarProps {
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

interface NavLinkProps {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  isActive: boolean
  badge?: string
  onClick?: () => void
}

function NavLink({ href, label, icon: Icon, isActive, badge, onClick }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={
        isActive
          ? "flex items-center gap-3 rounded-md bg-orange-50 px-3 py-2 text-sm font-medium text-orange-900 transition-colors dark:bg-orange-950/20 dark:text-orange-50"
          : "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      }
      onClick={onClick}
    >
      <Icon className={isActive ? "h-4 w-4 text-orange-500" : "h-4 w-4"} />
      <span className="flex-1">{label}</span>
      {badge ? <Badge className={isActive ? "bg-orange-500" : ""}>{badge}</Badge> : null}
    </Link>
  )
}

function UserCard({ mobile = false }: { mobile?: boolean }) {
  const { data: session } = useAuthSession()
  const user = session?.user

  return (
    <div className={mobile ? "border-t p-4" : "px-3 py-2"}>
      <div className="flex items-center gap-3">
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

        <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => signOutWithRedirect("/")}>
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Sign out</span>
        </Button>
      </div>
    </div>
  )
}

function SidebarContents({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const primaryNavItems = getNavItemsBySection("primary")
  const secondaryNavItems = getNavItemsBySection("secondary")

  return (
    <div className="mt-6 flex flex-1 flex-col px-3">
      <div className="space-y-1">
        {primaryNavItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            badge={item.badge}
            isActive={isNavItemActive(pathname, item)}
            onClick={onNavigate}
          />
        ))}
      </div>

      <Separator className="my-4" />

      <div className="space-y-1">
        {secondaryNavItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={isNavItemActive(pathname, item)}
            onClick={onNavigate}
          />
        ))}
      </div>
    </div>
  )
}

export function DashboardSidebar({ mobileOpen, onMobileOpenChange }: DashboardSidebarProps) {
  const [logoAvailable, setLogoAvailable] = useState(true)

  return (
    <>
      <aside className="fixed inset-y-0 hidden w-64 flex-col border-r bg-card/50 pt-5 backdrop-blur md:flex">
        <div className="flex items-center px-4">
          {logoAvailable ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo.svg" alt="RunAsh" className="h-8 w-8 rounded-full" onError={() => setLogoAvailable(false)} />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-400 font-bold text-white">
              R
            </div>
          )}
          <Link href="/" className="ml-2 text-xl font-bold text-transparent bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text">
            RunAsh
          </Link>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto">
          <SidebarContents />
          <div className="mt-auto pb-4">
            <Separator className="my-4" />
            <UserCard />
          </div>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-64 p-0 md:hidden">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center">
                {logoAvailable ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/logo.svg" alt="RunAsh" className="h-8 w-8 rounded-full" onError={() => setLogoAvailable(false)} />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-400 font-bold text-white">
                    R
                  </div>
                )}
                <Link href="/" className="ml-2 text-xl font-bold text-transparent bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text">
                  RunAsh
                </Link>
              </div>

              <Button variant="ghost" size="icon" onClick={() => onMobileOpenChange(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <SidebarContents onNavigate={() => onMobileOpenChange(false)} />
            </div>

            <UserCard mobile />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
