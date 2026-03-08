import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Info, LifeBuoy } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Editor Docs: Overview, Setup, Timeline, AI Settings, Collaboration, and Export",
  description:
    "End-to-end documentation for using the RunAsh Editor, from prerequisites and quick start to collaboration and troubleshooting.",
}

type Step = {
  title: string
  action: string
  expectedResult: string
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
    description: "What Editor does",
    steps: [
      {
        title: "Understand the workspace",
        action:
          "Open the editor and review the core layout: media/input tools, timeline, playback surface, generation settings, and export actions.",
        expectedResult: "You can identify where to upload assets, edit segments, run AI generation, and export outputs.",
      },
      {
        title: "Understand the project flow",
        action: "Follow the standard flow: create project → build timeline → generate/refine with AI → review → export/share.",
        expectedResult: "You know the order of operations for producing a first publishable draft.",
      },
      {
        title: "Confirm intended outcomes",
        action: "Define your output target (platform, duration, style, and quality) before editing.",
        expectedResult: "Your project is scoped clearly, which reduces regeneration loops and export mismatches.",
      },
    ],
  },
  {
    id: 2,
    title: "Prerequisites",
    description: "Account, media formats, and browser/device recommendations",
    steps: [
      {
        title: "Sign in with access",
        action: "Use an active RunAsh account with editor permissions for project creation, collaboration, and export.",
        expectedResult: "Editor routes and project controls are available without access errors.",
      },
      {
        title: "Prepare supported media",
        action: "Use MP4/MOV for video, MP3/WAV for audio, and PNG/JPG for images. Keep files cleanly named.",
        expectedResult: "Uploads validate quickly and assets appear in the project library.",
      },
      {
        title: "Use a recommended environment",
        action: "Use the latest Chrome or Edge on desktop with stable internet and enough free memory for timeline preview.",
        expectedResult: "Playback, upload, and generation controls remain responsive during editing sessions.",
      },
    ],
  },
  {
    id: 3,
    title: "Quick start",
    description: "Create project, pick model, upload media, and generate first output",
    steps: [
      {
        title: "Create a project",
        action: "From the editor dashboard, create a new project and add a short project goal/brief.",
        expectedResult: "A new workspace opens with a default timeline and autosave enabled.",
      },
      {
        title: "Pick a model",
        action: "Open Model settings and choose the generation model that fits your quality and speed goals.",
        expectedResult: "The project is configured with model defaults for generation behavior.",
      },
      {
        title: "Upload source media",
        action: "Add your clips, images, voiceovers, and music from the Inputs panel.",
        expectedResult: "All validated assets become available to place on timeline segments.",
      },
      {
        title: "Generate first output",
        action: "Add an initial prompt and run generation for a first cut.",
        expectedResult: "A render job is queued and a first output draft returns to your project.",
      },
    ],
  },
  {
    id: 4,
    title: "Timeline editing basics",
    description: "Segments, playhead, and controls",
    steps: [
      {
        title: "Arrange segments",
        action: "Drag and reorder timeline segments to establish story flow and pacing.",
        expectedResult: "The sequence plays in the intended order.",
      },
      {
        title: "Use the playhead",
        action: "Scrub the playhead to specific frames and mark exact edit points.",
        expectedResult: "You can place cuts and sync transitions with better timing accuracy.",
      },
      {
        title: "Apply basic controls",
        action: "Trim, split, duplicate, mute, and delete segments using timeline controls.",
        expectedResult: "Each segment reflects your intended duration and content behavior.",
      },
    ],
  },
  {
    id: 5,
    title: "AI generation settings",
    description: "Prompt, negative prompt, aspect ratio, resolution, duration, and quality",
    steps: [
      {
        title: "Write the main prompt",
        action: "Describe subject, action, style, and camera intent in concise language.",
        expectedResult: "Outputs align more closely with your intended visual direction.",
      },
      {
        title: "Set a negative prompt",
        action: "List things to avoid (artifacts, extra objects, undesired styles, text noise).",
        expectedResult: "The model suppresses common unwanted patterns.",
      },
      {
        title: "Configure output settings",
        action: "Set aspect ratio, resolution, and duration to match the destination platform.",
        expectedResult: "Rendered clips meet publishing constraints without reformatting.",
      },
      {
        title: "Tune quality settings",
        action: "Increase quality for final outputs and use balanced settings during iterative drafts.",
        expectedResult: "You optimize generation speed during editing and quality at final export.",
      },
    ],
  },
  {
    id: 6,
    title: "Collaboration and sharing workflow",
    description: "Team collaboration from invite to review handoff",
    steps: [
      {
        title: "Invite collaborators",
        action: "Share project access with the right teammates for editing or review.",
        expectedResult: "Collaborators can open the same project with appropriate permissions.",
      },
      {
        title: "Coordinate edits",
        action: "Use comments and role ownership to avoid overlapping edits on the same segment.",
        expectedResult: "Teams reduce conflicts and maintain a clean version flow.",
      },
      {
        title: "Share review drafts",
        action: "Generate a draft, share it for feedback, and then apply approved revisions.",
        expectedResult: "Review rounds are faster and final sign-off is easier to track.",
      },
    ],
  },
  {
    id: 7,
    title: "Export and troubleshooting",
    description: "Export flow plus fixes for common failures",
    steps: [
      {
        title: "Export with target settings",
        action: "Select final format/profile and verify required metadata before starting export.",
        expectedResult: "A final export job starts with publish-ready settings.",
      },
      {
        title: "Diagnose failed jobs",
        action: "If export or generation fails, check for invalid prompt/settings combinations and retry.",
        expectedResult: "Most failures are resolved with corrected settings and a clean rerun.",
      },
      {
        title: "Handle upload/performance issues",
        action: "Retry unstable uploads, reduce file sizes, close heavy tabs, and re-open the workspace if preview stalls.",
        expectedResult: "Editor responsiveness and job completion rates improve.",
      },
    ],
  },
]

const troubleshootingFaq = [
  {
    id: "upload-failure",
    question: "Upload keeps failing",
    answer:
      "Confirm file type support (MP4/MOV, MP3/WAV, PNG/JPG), check file size limits, and retry on a stable network connection.",
  },
  {
    id: "generation-failure",
    question: "Generation fails or stalls",
    answer:
      "Simplify prompts, reduce clip duration, and retry with balanced quality settings. Then raise quality after the draft validates.",
  },
  {
    id: "export-failure",
    question: "Export fails at final step",
    answer: "Re-check output ratio/resolution compatibility, confirm required metadata, and rerun export from the failed state.",
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
          <span className="font-medium text-foreground">Expected result:</span> {step.expectedResult}
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
          Follow this guide end-to-end to set up your project, edit on the timeline, tune AI generation, collaborate with your team, and export reliably.
        </p>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>How to use this page</AlertTitle>
          <AlertDescription>Work section-by-section. Each section contains numbered steps with an expected result checkpoint.</AlertDescription>
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
          Need hands-on help? Open the editor workspace and follow these steps in order.
        </div>
        <Button asChild>
          <Link href="/dashboard/editor">
            Open Editor Workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </main>
  )
}
