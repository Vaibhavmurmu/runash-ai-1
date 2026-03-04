import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type LandingSection = {
  title: string
  description: string
}

type LandingCta = {
  label: string
  href: string
}

type BrandLandingPageProps = {
  badge?: string
  title: string
  subtitle: string
  sections: LandingSection[]
  primaryCta?: LandingCta
  secondaryCta?: LandingCta
}

export default function BrandLandingPage({
  badge = "RunAsh AI",
  title,
  subtitle,
  sections,
  primaryCta,
  secondaryCta,
}: BrandLandingPageProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-white">
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300">
            {badge}
          </Badge>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
            {title}
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">{subtitle}</p>

          {(primaryCta || secondaryCta) && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {primaryCta && (
                <Button asChild className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white">
                  <Link href={primaryCta.href}>
                    {primaryCta.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              {secondaryCta && (
                <Button asChild variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-950">
                  <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {sections.map((section) => (
            <Card key={section.title} className="border-orange-100/70 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-white">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300">{section.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}
