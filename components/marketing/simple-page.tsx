import Link from "next/link"
import { Button } from "@/components/ui/button"

type Section = {
  title: string
  description: string
}

type SimplePageProps = {
  eyebrow: string
  title: string
  intro: string
  sections: Section[]
  ctaLabel: string
  ctaHref: string
}

export function SimplePage({ eyebrow, title, intro, sections, ctaLabel, ctaHref }: SimplePageProps) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-orange-600">{eyebrow}</p>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-lg text-slate-600">{intro}</p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-5xl gap-6 px-6 py-12 md:grid-cols-3">
          {sections.map((section) => (
            <article key={section.title} className="rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{section.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
