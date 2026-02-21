"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EnhancedDashboard } from "@/components/dashboard/enhanced-dashboard"
import { StreamQuickAccess } from "@/components/dashboard/stream-quick-access"
import { AIAgentsDashboard } from "@/components/ai-agents/ai-agents-dashboard"
import { AutomationDashboard } from "@/components/automation/automation-dashboard"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { ChatHost, EditorHost, SellerHost, StoreHost, type WorkspaceModule } from "@/components/dashboard/workspace/module-hosts"

const DEFAULT_MODULE: WorkspaceModule = "chat"
const MODULES: WorkspaceModule[] = ["chat", "editor", "store", "seller"]

function resolveModule(value: string | null): WorkspaceModule {
  return MODULES.includes(value as WorkspaceModule) ? (value as WorkspaceModule) : DEFAULT_MODULE
}

export default function DashboardPage() {
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
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
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
              <CardContent className="text-sm text-muted-foreground space-y-2">
                {MODULES.map((item) => (
                  <p key={item}>?module={item}</p>
                ))}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <AnalyticsDashboard />
      <AIAgentsDashboard />
      <AutomationDashboard />
    </div>
  )
}
