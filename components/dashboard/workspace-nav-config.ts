import { FilePenLine, MessageSquare } from "lucide-react"
import type { DashboardNavigationConfig } from "@/components/dashboard/dashboard-nav-config"

function matchesPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export const workspaceNavigationConfig: DashboardNavigationConfig = {
  items: [
    {
      label: "Editor",
      href: "/editor",
      icon: FilePenLine,
      section: "core",
      children: [{ label: "Editor Docs", href: "/editor/docs" }],
      activeMatch: (pathname) => matchesPathPrefix(pathname, "/editor"),
    },
    {
      label: "RunAshChat",
      href: "/runashchat",
      icon: MessageSquare,
      section: "core",
      activeMatch: (pathname) => matchesPathPrefix(pathname, "/runashchat"),
    },
  ],
  quickLinkGroups: [],
  quickActions: [
    { label: "Editor", href: "/editor" },
    { label: "Editor Docs", href: "/editor/docs" },
    { label: "RunAshChat", href: "/runashchat" },
  ],
  streamingStudioEntry: {
    label: "Streaming",
    href: "/stream",
    actionIds: [
      "start-stream",
      "schedule-stream",
      "invite-collaborator",
      "fetch-integration-key",
      "open-previous-live-session-context",
    ],
  },
}
