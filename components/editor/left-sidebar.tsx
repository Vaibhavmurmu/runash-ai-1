"use client"

import { useMemo, useState } from "react"
import { Sparkles, Video, MessageSquare, Radio, Layers, PanelLeft, ChevronRight } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { RIGHT_PANEL_TABS, type RightPanelTabId } from "./panel-tabs"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface LeftSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  isChatOpen?: boolean
  onChatToggle?: (open: boolean) => void
}

interface ToolItem {
  id: string
  label: string
  icon: typeof Sparkles
  desc: string
}

const TAB_ICON_BY_ID: Record<RightPanelTabId, ToolItem["icon"]> = {
  generate: Sparkles,
  edit: Video,
  layers: Layers,
  stream: Radio,
}

const TAB_DESC_BY_ID: Record<RightPanelTabId, string> = {
  generate: "AI video generation",
  edit: "Video editing tools",
  layers: "Layer management",
  stream: "Live streaming",
}

export default function LeftSidebar({ activeTab, onTabChange, isChatOpen, onChatToggle }: LeftSidebarProps) {
  const isMobile = useIsMobile()
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false)

  const tools = useMemo<ToolItem[]>(
    () => {
      const panelTools = RIGHT_PANEL_TABS.map((tab) => ({
        id: tab.id,
        label: tab.label,
        icon: TAB_ICON_BY_ID[tab.id],
        desc: TAB_DESC_BY_ID[tab.id],
      }))

      return [...panelTools.slice(0, 2), { id: "chat", label: "Chat", icon: MessageSquare, desc: "Talk to AI" }, ...panelTools.slice(2)]
    },
    [],
  )

  const handleTabChange = (tabId: string) => {
    if (tabId === "chat") {
      onChatToggle?.(!isChatOpen)
    } else {
      onTabChange(tabId)
      onChatToggle?.(false)
    }
    setIsMobileToolsOpen(false)
  }

  const activeToolLabel = tools.find((tool) => (tool.id === "chat" ? isChatOpen : activeTab === tool.id))?.label || "Tools"

  return (
    <>
      <nav
        aria-label="Editor tools"
        className="hidden md:flex bg-card border-r border-border flex-col items-center py-4 gap-2 w-16 lg:w-20"
      >
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleTabChange(tool.id)}
            className={`h-12 w-12 lg:w-14 lg:h-14 rounded-lg flex flex-col items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              (tool.id === "chat" ? isChatOpen : activeTab === tool.id)
                ? "bg-primary text-primary-foreground shadow-lg"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
            aria-label={tool.label}
            aria-current={(tool.id === "chat" ? isChatOpen : activeTab === tool.id) ? "page" : undefined}
            title={tool.label}
          >
            <tool.icon className="w-5 h-5" />
            <span className="hidden lg:block text-xs mt-1">{tool.label}</span>
          </button>
        ))}
      </nav>

      <div className="md:hidden border-b border-border bg-card px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-medium">{activeToolLabel}</span>
        <Sheet open={isMobileToolsOpen} onOpenChange={setIsMobileToolsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" aria-label="Open editor tools drawer">
              <PanelLeft className="w-4 h-4" />
              Tools
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-xs p-0">
            <SheetHeader className="border-b border-border p-4">
              <SheetTitle>Editor tools</SheetTitle>
              <SheetDescription>Pick a workspace tool or open assistant chat.</SheetDescription>
            </SheetHeader>
            <div className="p-2">
              {tools.map((tool) => (
                <Button
                  key={tool.id}
                  variant="ghost"
                  onClick={() => handleTabChange(tool.id)}
                  className="w-full justify-between h-12 px-3"
                  aria-label={`Open ${tool.label}`}
                >
                  <span className="flex items-center gap-2">
                    <tool.icon className="w-4 h-4" />
                    {tool.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {isMobile && (
        <nav
          aria-label="Quick editor tools"
          className="md:hidden fixed bottom-20 left-1/2 z-30 -translate-x-1/2 bg-card/95 backdrop-blur border border-border rounded-full px-2 py-1 flex items-center gap-1 shadow-lg"
        >
          {tools.slice(0, 4).map((tool) => (
            <Button
              key={tool.id}
              variant={(tool.id === "chat" ? isChatOpen : activeTab === tool.id) ? "default" : "ghost"}
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => handleTabChange(tool.id)}
              aria-label={tool.label}
            >
              <tool.icon className="w-4 h-4" />
            </Button>
          ))}
        </nav>
      )}
    </>
  )
}
