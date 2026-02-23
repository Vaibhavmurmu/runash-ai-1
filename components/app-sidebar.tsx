"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HelpCircle, Home, LogOut } from "lucide-react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { getNavItemsBySection, isNavItemActive } from "@/components/dashboard/dashboard-nav-config"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const navItems = [...getNavItemsBySection("primary"), ...getNavItemsBySection("secondary")]

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b">
        <div className="flex h-14 items-center px-4">
          <Logo />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/home"}>
              <Link href="/home">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isNavItemActive(pathname, item)}>
                  <Link href={item.href}>
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex flex-col gap-2">
          <Button variant="ghost" size="sm" className="justify-start">
            <HelpCircle className="mr-2 h-4 w-4" />
            Help & Support
          </Button>
          <Button variant="ghost" size="sm" className="justify-start text-muted-foreground">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
