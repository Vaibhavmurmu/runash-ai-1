"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EnhancedDashboard } from "@/components/dashboard/enhanced-dashboard"
import { StreamQuickAccess } from "@/components/dashboard/stream-quick-access"

const ChatHost = dynamic(() => import("@/components/dashboard/workspace/chat-host").then((mod) => mod.ChatHost), {
  loading: () => <ModuleHostSkeleton label="Chat workspace" />,
})

const EditorHost = dynamic(() => import("@/components/dashboard/workspace/editor-host").then((mod) => mod.EditorHost), {
  loading: () => <ModuleHostSkeleton label="Editor workspace" />,
})

const StoreHost = dynamic(() => import("@/components/dashboard/workspace/store-host").then((mod) => mod.StoreHost), {
  loading: () => <ModuleHostSkeleton label="Store workspace" />,
})

const SellerHost = dynamic(() => import("@/components/dashboard/workspace/seller-host").then((mod) => mod.SellerHost), {
  loading: () => <ModuleHostSkeleton label="Seller workspace" />,
})

const AnalyticsDashboard = dynamic(() => import("@/components/analytics/analytics-dashboard").then((mod) => mod.AnalyticsDashboard), {
  loading: () => <DeferredPanelSkeleton title="Loading analytics" />,
})

const AIAgentsDashboard = dynamic(() => import("@/components/ai-agents/ai-agents-dashboard").then((mod) => mod.AIAgentsDashboard), {
  loading: () => <DeferredPanelSkeleton title="Loading agents" />,
})

const AutomationDashboard = dynamic(() => import("@/components/automation/automation-dashboard").then((mod) => mod.AutomationDashboard), {
  loading: () => <DeferredPanelSkeleton title="Loading automation" />,
})

type WorkspaceModule = "chat" | "editor" | "store" | "seller"

const DEFAULT_MODULE: WorkspaceModule = "chat"
const MODULES: WorkspaceModule[] = ["chat", "editor", "store", "seller"]

function resolveModule(value: string | null): WorkspaceModule {
  return MODULES.includes(value as WorkspaceModule) ? (value as WorkspaceModule) : DEFAULT_MODULE
}

function ModuleHostSkeleton({ label }: { label: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>Preparing workspace module...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  )
}

function DeferredPanelSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  )
}

function DeferredSection({ children, title }: { children: ReactNode; title: string }) {
  const [shouldRender, setShouldRender] = useState(false)
  const markerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const marker = markerRef.current
    if (!marker || shouldRender) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true)
          observer.disconnect()
        }
      },
      { rootMargin: "240px" },
    )

    observer.observe(marker)
    return () => observer.disconnect()
  }, [shouldRender])

  return (
    <section ref={markerRef} className="content-visibility-auto contain-intrinsic-size-[800px]">
      {shouldRender ? children : <DeferredPanelSkeleton title={title} />}
    </section>
  )
}

export function DashboardShell() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [infoOpen, setInfoOpen] = useState(false)

  const moduleFromUrl = resolveModule(searchParams.get("module"))
  const [module, setModule] = useState<WorkspaceModule>(moduleFromUrl)

  useEffect(() => {
    setModule(moduleFromUrl)
  }, [moduleFromUrl])

  const setModuleWithUrl = (nextModule: WorkspaceModule) => {
    setModule(nextModule)
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set("module", nextModule)
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }

  const activeHost = useMemo(() => {
    const sharedProps = { openInfo: infoOpen, onOpenInfoChange: setInfoOpen }
    if (module === "editor") return <EditorHost {...sharedProps} />
    if (module === "store") return <StoreHost {...sharedProps} />
    if (module === "seller") return <SellerHost {...sharedProps} />
    return <ChatHost {...sharedProps} />
  }, [infoOpen, module])

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <EnhancedDashboard />
        </div>
        <div>
          <StreamQuickAccess />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace shell</CardTitle>
          <CardDescription>Switch between chat, editor, store, and seller modules without leaving dashboard context.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={module} onValueChange={(value) => setModuleWithUrl(value as WorkspaceModule)}>
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="store">Store</TabsTrigger>
              <TabsTrigger value="seller">Seller</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-6 lg:grid-cols-[3fr_1fr]">
            <div>{activeHost}</div>
            <Card>
              <CardHeader>
                <CardTitle>Module deep links</CardTitle>
                <CardDescription>Use query state to return to the same section instantly.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {MODULES.map((item) => (
                  <p key={item}>?module={item}</p>
                ))}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <DeferredSection title="Loading analytics">
        <AnalyticsDashboard />
      </DeferredSection>
      <DeferredSection title="Loading agents">
        <AIAgentsDashboard />
      </DeferredSection>
      <DeferredSection title="Loading automation">
        <AutomationDashboard />
      </DeferredSection>
    </div>
  )
}
