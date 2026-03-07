import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Info, LifeBuoy } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Editor Guide: Features, Quick Start, and Step-by-Step Workflow",
  description:
    "Learn how to onboard to the RunAsh Editor, discover core features, collaborate safely, and export production-ready videos.",
}

const getStartedSteps = [
  {
    title: "Create a project",
    action: "From the editor dashboard, start a new project and define your video goal.",
    outcome: "You get a workspace with a project ID, default timeline, and autosave enabled.",
  },
  {
    title: "Choose your generation model",
    action: "Open Model settings and select the model profile that matches your quality and speed needs.",
    outcome: "The project is configured with model defaults for prompts, frame behavior, and render profile.",
  },
  {
    title: "Upload source media",
    action: "Add clips, audio, images, or supporting assets using the Inputs panel.",
    outcome: "Uploaded files are validated and become available in your project asset library.",
  },
  {
    title: "Generate your first cut",
    action: "Write a prompt and run generation to produce your first video draft.",
    outcome: "A render job is queued, progress is tracked, and the output is added back into your timeline.",
  },
]

const faqItems = [
  {
    id: "upload-failures",
    question: "Why did my upload fail?",
    answer:
      "Most upload failures are caused by unsupported file formats, oversized files, or unstable network conditions. Re-encode to a supported format and retry on a stable connection.",
  },
  {
    id: "validation-errors",
    question: "What should I do when prompt validation fails?",
    answer:
      "Shorten long prompts, remove conflicting instructions, and ensure required fields are filled. Validation warnings often include the exact field that needs correction.",
  },
  {
    id: "stalled-generation",
    question: "How do I recover a stalled generation job?",
    answer:
      "Check render status for timeout or dependency issues, then retry from the failed job action. If stalls repeat, lower generation complexity and split into shorter segments.",
  },
]

export default function EditorDocsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Editor Guide: Features, Quick Start, and Step-by-Step Workflow</h1>
        <p className="max-w-4xl text-muted-foreground">
          This guide helps creators and teams move from onboarding to first publish quickly, while reducing common editing and generation errors.
        </p>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>New to the editor?</AlertTitle>
          <AlertDescription>Use the Get Started steps first, then continue section-by-section for deeper workflows.</AlertDescription>
        </Alert>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">1) What the editor does</h2>
        <Card>
          <CardHeader>
            <CardTitle>Overview + key capabilities</CardTitle>
            <CardDescription>RunAsh Editor combines timeline editing, AI-assisted generation, collaboration, and export in one workspace.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            <p>• Create and refine short-form or long-form videos with timeline controls and live playback.</p>
            <p>• Generate scenes from prompts, reusable presets, and project-level model settings.</p>
            <p>• Collaborate with teammates using shared projects, role-aware actions, and conflict protections.</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">2) Prerequisites</h2>
        <Card>
          <CardContent className="grid gap-3 pt-6 text-sm text-muted-foreground">
            <p>• Account/access: Sign in with an active RunAsh account and editor permissions.</p>
            <p>• Supported media: Use standard MP4/MOV video, MP3/WAV audio, and PNG/JPG image assets.</p>
            <p>• Recommended browser/device: Latest Chrome or Edge on desktop for best upload and timeline performance.</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3) Quick start</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {getStartedSteps.map((step, index) => (
            <Card key={step.title}>
              <CardHeader>
                <CardTitle className="text-lg">Step {index + 1}: {step.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">Action:</span> {step.action}
                </p>
                <div className="rounded-md border bg-muted/30 p-3 text-muted-foreground">
                  <span className="font-medium text-foreground">Expected outcome:</span> {step.outcome}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">4) Editing workflow</h2>
        <Card>
          <CardContent className="grid gap-2 pt-6 text-sm text-muted-foreground">
            <p>• Timeline basics: Arrange segments left-to-right to define scene order and pacing.</p>
            <p>• Add/remove/split: Insert new segments between scenes, trim by handles, or split where timing changes.</p>
            <p>• Playback controls: Use play, pause, scrub, and loop review to verify transitions and sync.</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">5) AI generation workflow</h2>
        <Card>
          <CardContent className="grid gap-2 pt-6 text-sm text-muted-foreground">
            <p>• Prompting: Keep prompts specific, include intent + style, and define duration constraints.</p>
            <p>• Model/config options: Tune quality, speed, and consistency settings based on your output goals.</p>
            <p>• Validation tips: Resolve warnings before generation to reduce retries and failed jobs.</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">6) Collaboration workflow</h2>
        <Card>
          <CardContent className="grid gap-2 pt-6 text-sm text-muted-foreground">
            <p>• Sharing: Invite collaborators by project and keep one source of truth for active edits.</p>
            <p>• Roles: Use role-based access for editing, reviewing, and publishing responsibilities.</p>
            <p>• Locks/conflicts: Timeline lock indicators protect active segments and prevent overwrite collisions.</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">7) Export &amp; publishing</h2>
        <Card>
          <CardContent className="grid gap-2 pt-6 text-sm text-muted-foreground">
            <p>• Metadata export: Validate title, tags, and destination fields before final render.</p>
            <p>• Render status: Track queued, running, completed, or failed states from the render jobs panel.</p>
            <p>• Failed jobs: Review error details, fix invalid inputs, and retry with adjusted settings.</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">8) FAQ / common errors</h2>
        <Accordion type="single" collapsible className="w-full rounded-md border px-4">
          {faqItems.map((item) => (
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
          Need hands-on support? Start from the workspace and follow this guide step-by-step.
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
