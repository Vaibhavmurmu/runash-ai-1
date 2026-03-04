"use client"

import { useMemo, useState } from "react"
import { PlusCircle } from "lucide-react"
import { CreateProjectModal, type QuickStartMode } from "@/components/dashboard/projects/create-project-modal"
import { DashboardStatePattern, type DashboardViewState } from "@/components/dashboard/dashboard-state-pattern"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type CreatedProject = {
  name: string
  quickStart: QuickStartMode
  model?: string
}

export default function DashboardCreateProjectPage() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projects, setProjects] = useState<CreatedProject[]>([])

  const state: DashboardViewState = useMemo(() => (projects.length === 0 ? "empty" : "ready"), [projects.length])

  const onCreate = async (payload: { name: string; description?: string; quickStart: QuickStartMode; selectedModel?: string }) => {
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 300))
    setProjects((current) => [{ name: payload.name, quickStart: payload.quickStart, model: payload.selectedModel }, ...current])
    setIsSubmitting(false)
    setOpen(false)
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <CreateProjectModal open={open} isSubmitting={isSubmitting} onCreate={onCreate} />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Create project</h1>
        <p className="text-sm text-muted-foreground">Launch a new project with quick-start defaults.</p>
      </div>

      <DashboardStatePattern
        state={state}
        title="No projects yet"
        description="Create a project to start editing content."
        emptyActionLabel="Open create project modal"
        onEmptyAction={() => setOpen(true)}
      >
        <Card>
          <CardHeader>
            <CardTitle>Recent project drafts</CardTitle>
            <CardDescription>Projects created from this route are listed here for quick access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => setOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New project
            </Button>
            <div className="space-y-2">
              {projects.map((project) => (
                <div key={`${project.name}-${project.quickStart}`} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{project.name}</p>
                  <p className="text-muted-foreground">Quick start: {project.quickStart}</p>
                  <p className="text-muted-foreground">Model: {project.model ?? "Default"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </DashboardStatePattern>
    </div>
  )
}
