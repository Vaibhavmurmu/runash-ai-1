"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export type QuickStartMode = "blank" | "import" | "template"

type CreateProjectModalProps = {
  open: boolean
  isSubmitting?: boolean
  onCreate: (payload: {
    name: string
    description?: string
    quickStart: QuickStartMode
    selectedModel?: string
  }) => Promise<void> | void
}

export function CreateProjectModal({ open, onCreate, isSubmitting = false }: CreateProjectModalProps) {
  const [name, setName] = useState("Untitled Project")
  const [description, setDescription] = useState("")
  const [selectedModel, setSelectedModel] = useState("wan-2.1")
  const [quickStart, setQuickStart] = useState<QuickStartMode>("blank")

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create your first project</DialogTitle>
          <DialogDescription>Choose a quick-start mode and create a project in the editor.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Description (optional)</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={300}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="selected-model">Default model</Label>
            <Input id="selected-model" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} maxLength={100} />
          </div>

          <div className="space-y-3">
            <Label>Quick start</Label>
            <RadioGroup value={quickStart} onValueChange={(value) => setQuickStart(value as QuickStartMode)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="blank" id="quick-start-blank" />
                <Label htmlFor="quick-start-blank">Blank project</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="import" id="quick-start-import" />
                <Label htmlFor="quick-start-import">Import media first</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="template" id="quick-start-template" />
                <Label htmlFor="quick-start-template">Use starter template</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() =>
              onCreate({
                name: name.trim() || "Untitled Project",
                description: description.trim() || undefined,
                selectedModel: selectedModel.trim() || undefined,
                quickStart,
              })
            }
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
