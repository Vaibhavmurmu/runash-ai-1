"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Video,
  Settings,
  Users,
  MessageSquare,
  Bell,
  HelpCircle,
  Home,
  LogOut,
  Upload,
  Calendar,
  Zap,
  Shield,
  CreditCard,
  ChevronDown,
  Search,
  Plus,
  Keyboard,
  Palette,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { ThemeToggle } from "@/components/theme-toggle"

const navigationSections = [
  {
    label: "Workspace",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: Home, badge: null },
      { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, badge: "Pro" },
      { name: "Streams", href: "/dashboard/streams", icon: Video, badge: null },
      { name: "Upload", href: "/dashboard/upload", icon: Upload, badge: null },
      { name: "Schedule", href: "/dashboard/schedule", icon: Calendar, badge: "3" },
    ],
  },
  {
    label: "Account",
    items: [
      { name: "Audience", href: "/dashboard/audience", icon: Users, badge: null },
      { name: "RunAsh Chat", href: "/dashboard/chat", icon: MessageSquare, badge: "12" },
      { name: "Settings", href: "/dashboard/settings", icon: Settings, badge: null },
      { name: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: "5" },
    ],
  },
  {
    label: "Preferences",
    items: [
      { name: "Keyboard Shortcuts", href: "/dashboard/settings#keyboard-shortcuts", icon: Keyboard, badge: null },
      { name: "Theme", href: "/dashboard/settings#theme", icon: Palette, badge: null },
      { name: "AI Features", href: "/dashboard/ai", icon: Zap, badge: "New" },
      { name: "Security", href: "/dashboard/security", icon: Shield, badge: null },
    ],
  },
  {
    label: "Support",
    items: [
      { name: "Billing", href: "/dashboard/billing", icon: CreditCard, badge: null },
      { name: "Help & Support", href: "/dashboard/support", icon: HelpCircle, badge: null },
    ],
  },
]

const itemDescriptions: Record<string, string> = {
  Dashboard: "Overview of your streaming performance and quick actions.",
  Analytics: "Detailed insights into your audience, engagement, and revenue.",
  Streams: "Manage your live streams and recorded content.",
  Upload: "Upload and convert your media files for streaming.",
  Schedule: "Plan and schedule your upcoming streams.",
  Audience: "Track audience growth and segment your community.",
  "RunAsh Chat": "Review conversation threads and respond faster.",
  Settings: "Configure your account-level workspace settings.",
  Notifications: "Control activity alerts and update delivery channels.",
  "Keyboard Shortcuts": "Quickly navigate your workspace using shortcuts.",
  Theme: "Set your preferred appearance and color mode.",
  "AI Features": "Enable and configure assistant-powered workflows.",
  Security: "Manage access controls and security safeguards.",
  Billing: "View plans, invoices, and payment details.",
  "Help & Support": "Find documentation and contact support.",
}

export function EnhancedSidebar() {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <SidebarHeader className="border-b border-border/40 p-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 shadow-lg">
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">R</div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
                  RunAsh
                </span>
                <span className="text-xs text-muted-foreground">AI Studio</span>
              </div>
            </Link>
            <SidebarTrigger />
          </div>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-border/40"
            />
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2">
          {navigationSections.map((section, sectionIndex) => (
            <div key={section.label}>
              {sectionIndex > 0 && <Separator className="my-4 bg-border/40" />}
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => {
                      const isActive = pathname === item.href

                      return (
                        <SidebarMenuItem key={item.name}>
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                                <Link href={item.href} className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <item.icon className="mr-3 h-4 w-4" />
                                    <span>{item.name}</span>
                                  </div>
                                  {item.badge && (
                                    <Badge
                                      variant={item.badge === "New" ? "default" : "secondary"}
                                      className={`text-xs ${
                                        item.badge === "New"
                                          ? "bg-gradient-to-r from-orange-500 to-amber-400 text-white"
                                          : ""
                                      }`}
                                    >
                                      {item.badge}
                                    </Badge>
                                  )}
                                </Link>
                              </SidebarMenuButton>
                            </HoverCardTrigger>
                            <HoverCardContent side="right" className="w-80">
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold">{item.name}</h4>
                                <p className="text-sm text-muted-foreground">{itemDescriptions[item.name]}</p>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-border/40 p-4">
          <div className="flex flex-col gap-4">
            <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500 text-white shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              New Stream
            </Button>

            <div className="flex items-center justify-between">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 p-2 h-auto">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-400 text-white text-sm">
                        JD
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">John Doe</span>
                      <span className="text-xs text-muted-foreground">Pro Plan</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                    Workspace
                  </DropdownMenuLabel>
                  <DropdownMenuItem>
                    <Users className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                    Account
                  </DropdownMenuLabel>
                  <DropdownMenuItem>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                    Preferences
                  </DropdownMenuLabel>
                  <DropdownMenuItem>
                    <Keyboard className="mr-2 h-4 w-4" />
                    Keyboard Shortcuts
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Palette className="mr-2 h-4 w-4" />
                    Theme
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                    Support
                  </DropdownMenuLabel>
                  <DropdownMenuItem>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help & Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <ThemeToggle />
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  )
}
