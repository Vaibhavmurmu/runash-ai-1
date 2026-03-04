"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  LIBRARY_ITEMS,
  PROJECT_TEMPLATES,
  WIZARD_STORAGE_KEY,
  type ProjectTemplateId,
} from "@/lib/workspace/project-library-domain"

export function CreateProjectWizard() {
  const router = useRouter()
  const { toast } = useToast()
  const [name, setName] = useState("Untitled Project")
  const [description, setDescription] = useState("")
  const [templateId, setTemplateId] = useState<ProjectTemplateId>(PROJECT_TEMPLATES[0].id)
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedTemplate = useMemo(
    () => PROJECT_TEMPLATES.find((template) => template.id === templateId) ?? PROJECT_TEMPLATES[0],
    [templateId],
  )

  const toggleLibraryItem = (itemId: string) => {
    setSelectedLibraryIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    )
  }

  const createProject = async () => {
    setIsSubmitting(true)
    try {
      const payload = {
        name: name.trim() || "Untitled Project",
        description: description.trim() || undefined,
        quickStart: selectedTemplate.quickStart,
        selectedModel: selectedTemplate.selectedModel,
        metadata: {
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          libraryItemIds: selectedLibraryIds,
          streamPreset: selectedTemplate.streamPreset,
          chatBootstrapPrompt: selectedTemplate.chatBootstrapPrompt,
        },
      }

      const createRes = await fetch("/api/editor/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!createRes.ok) throw new Error("Failed to create project")

      const createJson = await createRes.json()
      const createdProjectId = String(createJson.project?.id)

      const sharedOutput = {
        name: payload.name,
        description: payload.description,
        selectedModel: selectedTemplate.selectedModel,
        templateId: selectedTemplate.id,
        streamPreset: selectedTemplate.streamPreset,
        libraryItemIds: selectedLibraryIds,
        projectId: createdProjectId,
      }

      localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(sharedOutput))
      localStorage.setItem(
        "runash_chat_bootstrap_context",
        JSON.stringify({
          projectName: payload.name,
          templateName: selectedTemplate.name,
          prompt: selectedTemplate.chatBootstrapPrompt,
          libraryItemIds: selectedLibraryIds,
        }),
      )
      localStorage.setItem("runash_initial_prompt", selectedTemplate.chatBootstrapPrompt)
      localStorage.setItem(
        "runash_streaming_preset",
        JSON.stringify({
          projectId: createdProjectId,
          projectName: payload.name,
          ...selectedTemplate.streamPreset,
        }),
      )

      toast({ title: "Project created", description: "Editor, chat, and streaming presets are now linked." })
      router.push(`/dashboard/editor?projectId=${encodeURIComponent(createdProjectId)}&projectName=${encodeURIComponent(payload.name)}`)
    } catch {
      toast({ title: "Creation failed", description: "Unable to create your project right now.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Create Project Wizard</h1>
        <p className="text-sm text-muted-foreground">Set one project profile and reuse it across editor, streaming, and chat.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project basics</CardTitle>
          <CardDescription>Name your project and choose a template.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wizard-project-name">Project name</Label>
            <Input id="wizard-project-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-project-description">Description</Label>
            <Textarea
              id="wizard-project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional project description"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {PROJECT_TEMPLATES.map((template) => {
              const selected = template.id === selectedTemplate.id
              return (
                <button
                  type="button"
                  key={template.id}
                  onClick={() => setTemplateId(template.id)}
                  className={`rounded-lg border p-4 text-left transition-colors ${selected ? "border-orange-500 bg-orange-50" : "hover:bg-muted/40"}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{template.name}</p>
                    {selected ? <Check className="h-4 w-4 text-orange-600" /> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline">{template.quickStart}</Badge>
                    <Badge variant="secondary">{template.streamPreset.aiAgent}</Badge>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Starter library bindings</CardTitle>
          <CardDescription>Select assets, datasets, and prompts to include in the shared context.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {LIBRARY_ITEMS.map((item) => {
            const selected = selectedLibraryIds.includes(item.id)
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => toggleLibraryItem(item.id)}
                className={`rounded-lg border p-3 text-left ${selected ? "border-orange-500 bg-orange-50" : "hover:bg-muted/40"}`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{item.title}</p>
                  <Badge variant="outline">{item.type}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </button>
            )
          })}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={createProject} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Create and open editor
        </Button>
        <Button variant="outline" onClick={() => router.push("/dashboard/library")}>
          Open library
        </Button>
      </div>
    </div>
  )
}
