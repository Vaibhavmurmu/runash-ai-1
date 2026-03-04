export type ProjectTemplateId = "launch" | "course" | "podcast" | "clip-pack"

export type ProjectTemplate = {
  id: ProjectTemplateId
  name: string
  description: string
  quickStart: "blank" | "import" | "template"
  selectedModel: string
  streamPreset: {
    title: string
    category: string
    aiAgent: string
  }
  chatBootstrapPrompt: string
}

export type LibraryItemType = "asset" | "dataset" | "prompt"

export type LibraryItem = {
  id: string
  type: LibraryItemType
  title: string
  description: string
  tags: string[]
}

export type ProjectWizardOutput = {
  name: string
  description?: string
  selectedModel: string
  templateId: ProjectTemplateId
  libraryItemIds: string[]
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "launch",
    name: "Product Launch Live",
    description: "Launch event format with editor timeline defaults and stream-ready configuration.",
    quickStart: "template",
    selectedModel: "wan-2.1",
    streamPreset: { title: "Launch Event", category: "Launch", aiAgent: "LaunchBot" },
    chatBootstrapPrompt: "Prepare a launch-day runbook with script beats, CTA moments, and backup plans.",
  },
  {
    id: "course",
    name: "Learning Session",
    description: "Tutorial-first setup for educational sessions, chapter clips, and recap assets.",
    quickStart: "template",
    selectedModel: "wan-2.1",
    streamPreset: { title: "Learning Session", category: "Education", aiAgent: "TutorBot" },
    chatBootstrapPrompt: "Draft an engaging lesson flow and checkpoints for learner interaction.",
  },
  {
    id: "podcast",
    name: "Podcast Production",
    description: "Audio-first editing with reusable segment timing and streaming highlights.",
    quickStart: "import",
    selectedModel: "wan-2.1",
    streamPreset: { title: "Podcast Live Edit", category: "Podcast", aiAgent: "AudioBot" },
    chatBootstrapPrompt: "Generate episode show notes, social snippets, and follow-up topic suggestions.",
  },
  {
    id: "clip-pack",
    name: "Short Clips Pack",
    description: "High-volume clip extraction and caption-ready content workflow.",
    quickStart: "import",
    selectedModel: "wan-2.1",
    streamPreset: { title: "Clips Session", category: "Highlights", aiAgent: "ClipBot" },
    chatBootstrapPrompt: "Plan a weekly clip pipeline with hooks, captions, and publishing cadence.",
  },
]

export const LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: "asset-brand-opener",
    type: "asset",
    title: "Brand Opener Motion Pack",
    description: "Reusable 5-second animated opener with configurable title overlays.",
    tags: ["branding", "video", "intro"],
  },
  {
    id: "asset-product-broll",
    type: "asset",
    title: "Product B-Roll Pack",
    description: "Studio and lifestyle B-roll clips for catalog and launch videos.",
    tags: ["video", "broll", "commerce"],
  },
  {
    id: "dataset-q1-performance",
    type: "dataset",
    title: "Q1 Performance Snapshot",
    description: "Curated engagement and conversion metrics dataset for strategy prompts.",
    tags: ["analytics", "dataset", "performance"],
  },
  {
    id: "dataset-customer-intent",
    type: "dataset",
    title: "Customer Intent Clusters",
    description: "Audience intent segments extracted from chat and session interactions.",
    tags: ["audience", "dataset", "insights"],
  },
  {
    id: "prompt-live-cta",
    type: "prompt",
    title: "Live CTA Sequence",
    description: "Prompt sequence for live CTAs across intro, midpoint, and wrap-up.",
    tags: ["prompt", "conversion", "live"],
  },
  {
    id: "prompt-edit-qc",
    type: "prompt",
    title: "Editor Quality Checklist",
    description: "Prompt template to validate pacing, cuts, sound levels, and subtitle quality.",
    tags: ["prompt", "editor", "quality"],
  },
]

export const WIZARD_STORAGE_KEY = "runash_project_wizard_output"

