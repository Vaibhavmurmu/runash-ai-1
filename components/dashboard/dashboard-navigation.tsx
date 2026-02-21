"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOutWithRedirect, useAuthSession } from "@/lib/auth/access-client"
import {
  LayoutDashboard,
  Video,
  Calendar,
  BarChart3,
  Upload,
  Settings,
  Users,
  Bell,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Store,
  MessageSquare,
  Clapperboard,
  ShoppingBag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  badge?: string | number
  isActive?: boolean
  onClick?: () => void
}

type NavCapability = "core" | "chat" | "editor" | "store" | "seller"
type NavSection = "primary" | "secondary"

interface DashboardNavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: string | number
  capabilities: NavCapability[]
  section: NavSection
  activeMatch?: (pathname: string) => boolean
}

const dashboardNavigationConfig: DashboardNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    capabilities: ["core"],
    section: "primary",
  },
  {
    label: "RunAsh Chat",
    href: "/runash-chat",
    icon: <MessageSquare className="h-4 w-4" />,
    capabilities: ["chat"],
    section: "primary",
    activeMatch: (pathname) => pathname.startsWith("/runash-chat"),
  },
  {
    label: "Editor",
    href: "/editor",
    icon: <Clapperboard className="h-4 w-4" />,
    capabilities: ["editor"],
    section: "primary",
    activeMatch: (pathname) => pathname.startsWith("/editor"),
  },
  {
    label: "Store",
    href: "/ecommerce/dashboard",
    icon: <Store className="h-4 w-4" />,
    capabilities: ["store"],
    section: "primary",
    activeMatch: (pathname) => pathname.startsWith("/ecommerce"),
  },
  {
    label: "Seller Dashboard",
    href: "/seller/dashboard",
    icon: <ShoppingBag className="h-4 w-4" />,
    capabilities: ["seller"],
    section: "primary",
    activeMatch: (pathname) => pathname.startsWith("/seller"),
  },
  {
    label: "Go Live",
    href: "/stream",
    icon: <Video className="h-4 w-4" />,
    badge: "New",
    capabilities: ["core"],
    section: "secondary",
    activeMatch: (pathname) => pathname.startsWith("/stream"),
  },
  {
    label: "Schedule",
    href: "/schedule",
    icon: <Calendar className="h-4 w-4" />,
    capabilities: ["core"],
    section: "secondary",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: <BarChart3 className="h-4 w-4" />,
    capabilities: ["core"],
    section: "secondary",
    activeMatch: (pathname) => pathname.startsWith("/analytics"),
  },
  {
    label: "Upload",
    href: "/upload",
    icon: <Upload className="h-4 w-4" />,
    capabilities: ["core"],
    section: "secondary",
  },
  {
    label: "Recordings",
    href: "/recordings",
    icon: <Video className="h-4 w-4" />,
    capabilities: ["core"],
    section: "secondary",
  },
  {
    label: "Alerts",
    href: "/alerts",
    icon: <Bell className="h-4 w-4" />,
    capabilities: ["core"],
    section: "secondary",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="h-4 w-4" />,
    capabilities: ["core"],
    section: "secondary",
  },
  {
    label: "Community",
    href: "/community",
    icon: <Users className="h-4 w-4" />,
    capabilities: ["core"],
    section: "secondary",
  },
  {
    label: "Help & Support",
    href: "/support",
    icon: <HelpCircle className="h-4 w-4" />,
    capabilities: ["core"],
    section: "secondary",
  },
]

function NavItem({ href, icon, label, badge, isActive, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
        ${
          isActive
            ? "bg-orange-50 text-orange-900 dark:bg-orange-950/20 dark:text-orange-50"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }
      `}
      onClick={onClick}
    >
      <span className={isActive ? "text-orange-500" : "text-muted-foreground"}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && (
        <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-orange-500" : ""}>
          {badge}
        </Badge>
      )}
    </Link>
  )
}

export function DashboardNavigation() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [logoAvailable, setLogoAvailable] = useState(true)

  // unified auth session for real user data
  const { data: session } = useAuthSession()
  const user = session?.user

  const primaryNavItems = dashboardNavigationConfig.filter((item) => item.section === "primary")
  const secondaryNavItems = dashboardNavigationConfig.filter((item) => item.section === "secondary")

  const isActiveRoute = (item: DashboardNavItem) =>
    item.activeMatch ? item.activeMatch(pathname) : pathname === item.href

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const handleLogout = async (closeMenu?: boolean) => {
    if (closeMenu) closeMobileMenu()
    // sign out and redirect to homepage
    await signOutWithRedirect("/")
  }

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow border-r bg-card/50 backdrop-blur pt-5 overflow-y-auto">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center">
              {/* Logo: try to show /logo.svg, fallback to gradient "R" */}
              {logoAvailable ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/logo.svg"
                  alt="RunAsh"
                  className="h-8 w-8 rounded-full"
                  onError={() => setLogoAvailable(false)}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-center text-white font-bold">
                  R
                </div>
              )}
              <Link href="/" className="ml-2 text-xl font-bold bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
                RunAsh
              </Link>
            </div>
            <ThemeToggle />
          </div>

          <div className="mt-6 flex flex-col flex-1 px-3">
            <div className="space-y-1">
              {primaryNavItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  badge={item.badge}
                  isActive={isActiveRoute(item)}
                />
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-1">
              {secondaryNavItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isActive={isActiveRoute(item)}
                />
              ))}
            </div>

            <div className="mt-auto pb-4">
              <Separator className="my-4" />
              <div className="px-3 py-2">
                <div className="flex items-center gap-3">
                  <Avatar>
                    {user?.image ? (
                      <AvatarImage src={user.image} />
                    ) : (
                      <>
                        <AvatarImage src="/placeholder.svg" />
                        <AvatarFallback className="bg-gradient-to-r from-orange-500 to-amber-400 text-white">
                          {user?.name ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("") : "JS"}
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name ?? "Guest User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email ?? "guest@runash.ai"}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => handleLogout()}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur">
        <div className="flex items-center">
          {logoAvailable ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/logo.svg"
              alt="RunAsh"
              className="h-8 w-8 rounded-full"
              onError={() => setLogoAvailable(false)}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-center text-white font-bold">
              R
            </div>
          )}
          <Link href="/" className="ml-2 text-xl font-bold bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
            RunAsh
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center">
                    {logoAvailable ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src="/logo.svg"
                        alt="RunAsh"
                        className="h-8 w-8 rounded-full"
                        onError={() => setLogoAvailable(false)}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-center text-white font-bold">
                        R
                      </div>
                    )}
                    <Link href="/" className="ml-2 text-xl font-bold bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
                      RunAsh
                    </Link>
                  </div>
                  <Button variant="ghost" size="icon" onClick={closeMobileMenu}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3">
                  <div className="space-y-1">
                    {primaryNavItems.map((item) => (
                      <NavItem
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        label={item.label}
                        badge={item.badge}
                        isActive={isActiveRoute(item)}
                        onClick={closeMobileMenu}
                      />
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-1">
                    {secondaryNavItems.map((item) => (
                      <NavItem
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        label={item.label}
                        isActive={isActiveRoute(item)}
                        onClick={closeMobileMenu}
                      />
                    ))}
                  </div>
                </div>

                <div className="border-t p-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {user?.image ? (
                        <AvatarImage src={user.image} />
                      ) : (
                        <>
                          <AvatarImage src="/placeholder.svg" />
                          <AvatarFallback className="bg-gradient-to-r from-orange-500 to-amber-400 text-white">
                            {user?.name ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("") : "JS"}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user?.name ?? "Guest User"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email ?? "guest@runash.ai"}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      onClick={() => handleLogout(true)}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  )
  }
  
