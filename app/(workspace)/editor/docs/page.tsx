import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Info, LifeBuoy } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "RunAsh Editor Documentation: Onboarding, Timeline, AI Settings, Collaboration, and Export",
  description:
    "Learn how to onboard into the RunAsh Editor with prerequisites, quick start, timeline editing, AI generation settings, collaboration, and export troubleshooting.",
}

type Step = {
  title: string
  action: string
  expectedResults: string[]
}

type Section = {
  id: number
  title: string
  description: string
  steps: Step[]
}

const sections: Section[] = [
  {
    id: 1,
    title: "Overview",
    description: "What the editor includes and how a project typically flows.",
    steps: [
      {
        title: "Understand the workspace",
        action:
          "Open the editor and identify the layout: project library, timeline, preview surface, AI settings, and export actions.",
        expectedResults: [
          "You can point to where media uploads, timeline edits, and export actions happen.",
          "You can explain the difference between draft iterations and final export.",
        ],
      },
      {
        title: "Understand the end-to-end flow",
        action: "Follow the standard workflow: create project → edit timeline → tune AI settings → review with collaborators → export.",
        expectedResults: [
          "You know which stage to move to next without guesswork.",
          "You can estimate where feedback and approvals should happen.",
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Prerequisites",
    description: "Account, browser/device, and input preparation checks before starting.",
    steps: [
      {
        title: "Confirm account access",
        action: "Sign in with a RunAsh account that has editor access and collaboration permissions.",
        expectedResults: [
          "You can open the editor dashboard without permission errors.",
          "Project creation and sharing controls are visible.",
        ],
      },
      {
        title: "Prepare compatible media",
        action: "Gather source files in supported formats (video, audio, and image assets) and use clear file names.",
        expectedResults: [
          "Uploads complete and appear in the project library.",
          "Assets are easy to identify while building timeline segments.",
        ],
      },
      {
        title: "Use a recommended environment",
        action: "Use an updated Chromium-based desktop browser and a stable connection for rendering and playback.",
        expectedResults: [
          "Timeline scrubbing and preview remain responsive.",
          "Generation and export jobs start reliably.",
        ],
      },
    ],
  },
  {
    id: 3,
    title: "Quick Start",
    description: "Numbered setup steps to produce your first draft quickly.",
    steps: [
      {
        title: "Create your first project",
        action: "Open the editor dashboard, start a new project, and add a short goal/brief.",
        expectedResults: [
          "A project workspace opens with autosave and a default timeline.",
          "The project appears in your recent projects list.",
        ],
      },
      {
        title: "Upload source assets",
        action: "Add clips, audio tracks, images, or references from the input panel.",
        expectedResults: [
          "All validated assets are available for drag-and-drop on the timeline.",
          "Asset previews show correct durations and names.",
        ],
      },
      {
        title: "Configure generation baseline",
        action: "Select an initial model and set prompt + output constraints for your first pass.",
        expectedResults: [
          "The project uses your selected default generation profile.",
          "A first generation run starts without validation errors.",
        ],
      },
      {
        title: "Run and review first draft",
        action: "Generate a draft output, inspect pacing in preview, and capture revision notes.",
        expectedResults: [
          "A first draft returns to your project history.",
          "You have concrete adjustment notes for the next pass.",
        ],
      },
    ],
  },
  {
    id: 4,
    title: "Timeline Editing",
    description: "Core timeline operations for structure, pacing, and refinement.",
    steps: [
      {
        title: "Arrange and trim segments",
        action: "Reorder clips, trim edges, and split long segments to match narrative flow.",
        expectedResults: [
          "Playback follows your intended story order.",
          "Segment boundaries align with key beats.",
        ],
      },
      {
        title: "Use the playhead for precision",
        action: "Scrub frame-by-frame to place accurate cuts and transition points.",
        expectedResults: [
          "Cut points land where expected in preview.",
          "Audio/visual sync improves on repeated playback.",
        ],
      },
      {
        title: "Apply utility controls",
        action: "Duplicate, mute, lock, or remove segments to clean up your sequence.",
        expectedResults: [
          "Timeline complexity is reduced without losing intended content.",
          "The sequence is easier for collaborators to review.",
        ],
      },
    ],
  },
  {
    id: 5,
    title: "AI Generation Settings",
    description: "Prompting and output controls for quality, speed, and consistency.",
    steps: [
      {
        title: "Define prompt and constraints",
        action: "Write a concise prompt covering subject, style, motion, and camera intent, then add constraints as needed.",
        expectedResults: [
          "Draft outputs align more closely with the intended direction.",
          "Fewer random artifacts appear across iterations.",
        ],
      },
      {
        title: "Set negative guidance",
        action: "Specify elements to avoid (styles, artifacts, text noise, or objects).",
        expectedResults: [
          "Undesired patterns are reduced in subsequent generations.",
          "Iteration count drops because fewer corrections are needed.",
        ],
      },
      {
        title: "Tune output profile",
        action: "Choose aspect ratio, resolution, and duration based on destination channel requirements.",
        expectedResults: [
          "Output fits publishing constraints without additional reformatting.",
          "Final render settings are reusable for similar projects.",
        ],
      },
    ],
  },
  {
    id: 6,
    title: "Collaboration",
    description: "How to invite teammates and run smooth review loops.",
    steps: [
      {
        title: "Invite and assign roles",
        action: "Share project access with teammates and clarify who edits versus who reviews.",
        expectedResults: [
          "Invited collaborators can open the project with expected permissions.",
          "Ownership boundaries reduce conflicting edits.",
        ],
      },
      {
        title: "Coordinate feedback cycles",
        action: "Share draft checkpoints, collect comments, and apply agreed revisions in batches.",
        expectedResults: [
          "Feedback is centralized and easier to action.",
          "Revision history remains understandable for the team.",
        ],
      },
    ],
  },
  {
    id: 7,
    title: "Export + Troubleshooting",
    description: "Final output checks and common issue recovery steps.",
    steps: [
      {
        title: "Export with final profile",
        action: "Confirm target settings and metadata before launching final export.",
        expectedResults: [
          "A final render job starts with publish-ready settings.",
          "The exported file matches expected ratio, quality, and duration.",
        ],
      },
      {
        title: "Recover from failed jobs",
        action: "If generation/export fails, simplify settings, verify inputs, and retry with a clean rerun.",
        expectedResults: [
          "Most failures are resolved after correcting invalid combinations.",
          "You can identify whether the issue is input, settings, or environment related.",
        ],
      },
    ],
  },
]

const troubleshootingFaq = [
  {
    id: "upload-failure",
    question: "Upload keeps failing",
    answer: "Check file format compatibility, confirm connection stability, and retry with smaller chunks if needed.",
  },
  {
    id: "generation-failure",
    question: "Generation fails or stalls",
    answer: "Start with balanced quality and shorter durations, validate output, then increase quality for final passes.",
  },
  {
    id: "export-failure",
    question: "Export fails at final step",
    answer: "Re-check output profile compatibility, required metadata, and any conflicting timeline settings before rerunning.",
  },
]

function StepCard({ index, step }: { index: number; step: Step }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Step {index + 1}: {step.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <span className="font-medium">Action:</span> {step.action}
        </p>
        <div className="rounded-md border bg-muted/30 p-3 text-muted-foreground">
          <p className="font-medium text-foreground">Expected result:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {step.expectedResults.map((result) => (
              <li key={result}>{result}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export default function EditorDocsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Editor Documentation</h1>
        <p className="max-w-4xl text-muted-foreground">
          Follow this guide end-to-end to onboard into the editor, ship your first draft quickly, and troubleshoot export issues with confidence.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/editor">
              Get Started in Editor
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/onboarding">Create Project</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/settings/billing">Settings & Billing</Link>
          </Button>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>How to use this page</AlertTitle>
          <AlertDescription>
            Work section-by-section. Each step includes an “Expected result” checklist so you can verify progress before moving on.
          </AlertDescription>
        </Alert>
      </section>

      {sections.map((section) => (
        <section key={section.id} className="space-y-4">
          <h2 className="text-2xl font-semibold">
            {section.id}) {section.title}
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            {section.steps.map((step, index) => (
              <StepCard key={`${section.id}-${step.title}`} index={index} step={step} />
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Common failures and fixes</h2>
        <Accordion type="single" collapsible className="w-full rounded-md border px-4">
          {troubleshootingFaq.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LifeBuoy className="h-4 w-4" />
          Ready to apply this guide? Start in the editor and follow each section in order.
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/editor">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/onboarding">Project Creation</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
