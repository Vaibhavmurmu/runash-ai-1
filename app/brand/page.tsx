import type { Metadata } from "next"
import Link from "next/link"
import { Download, ExternalLink } from "lucide-react"

export const metadata: Metadata = {
  title: "Brand Assets | RunAsh",
  description:
    "Download official RunAsh logos, review brand guidelines, and access approved assets for press and partner use.",
}

const brandAssets = [
  {
    name: "Primary Logo (PNG)",
    file: "/logo.png",
    format: "PNG",
    notes: "Preferred for web and social placements on light backgrounds.",
  },
  {
    name: "RunAsh Logo (JPG)",
    file: "/runashlogo.jpg",
    format: "JPG",
    notes: "For editorial and presentation use when JPG is required.",
  },
  {
    name: "Placeholder Logo (SVG)",
    file: "/placeholder-logo.svg",
    format: "SVG",
    notes: "Scalable vector for high-resolution print and large-format output.",
  },
  {
    name: "Placeholder Logo (PNG)",
    file: "/placeholder-logo.png",
    format: "PNG",
    notes: "Raster fallback for tools that do not support SVG.",
  },
  {
    name: "Brand Icon (SVG)",
    file: "/icon.svg",
    format: "SVG",
    notes: "Compact mark for avatars, favicons, and small placements.",
  },
]

const mediaKitResources = [
  {
    title: "Logo Package",
    description: "RunAsh AI logos in various formats and colors.",
  },
  {
    title: "Product Screenshots",
    description: "High-resolution screenshots of the RunAsh AI platform.",
  },
  {
    title: "Founder Photos",
    description: "Professional headshots of RunAsh AI's founding team.",
  },
  {
    title: "Brand Guidelines",
    description: "Official brand colors, typography, and usage rules.",
  },
]

export default function BrandPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      <section className="border-b border-orange-200/60 bg-gradient-to-br from-white via-orange-50/40 to-white py-20 dark:border-orange-900/40 dark:from-gray-950 dark:via-orange-950/20 dark:to-gray-950">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex rounded-full border border-orange-300/70 bg-orange-100/60 px-4 py-1 text-sm font-medium text-orange-700 dark:border-orange-700/50 dark:bg-orange-900/30 dark:text-orange-300">
              Canonical Brand Assets
            </p>
            <h1 className="mb-5 text-4xl font-bold tracking-tight md:text-5xl">RunAsh Brand Assets</h1>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              Download official RunAsh AI logos, reference brand guidance, and use approved assets consistently across
              editorial, partner, and press materials.
            </p>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl rounded-2xl border border-orange-200/60 bg-white p-8 shadow-sm dark:border-orange-900/40 dark:bg-gray-900">
            <h2 className="mb-3 text-2xl font-semibold">Media Kit Resources</h2>
            <p className="mb-8 text-gray-700 dark:text-gray-300">
              This brand page is the canonical source for logo usage and downloads. For broader media needs, you can
              also review press resources.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {mediaKitResources.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-orange-200/50 bg-orange-50/40 p-5 dark:border-orange-900/30 dark:bg-orange-950/20"
                >
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{item.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
              <Link href="/press" className="font-medium text-orange-600 hover:underline dark:text-orange-400">
                Visit Press Page <ExternalLink className="ml-1 inline h-4 w-4" />
              </Link>
              <a href="mailto:press@runash.in" className="font-medium text-orange-600 hover:underline dark:text-orange-400">
                Request complete media kit bundle
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-14">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 text-2xl font-semibold">Asset Catalog</h2>
            <div className="grid gap-5 md:grid-cols-2">
              {brandAssets.map((asset) => (
                <article
                  key={asset.file}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                    {asset.format}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{asset.name}</h3>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{asset.notes}</p>
                  <div className="mt-4 flex items-center gap-4">
                    <a
                      href={asset.file}
                      download
                      className="inline-flex items-center rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700"
                    >
                      Download <Download className="ml-2 h-4 w-4" />
                    </a>
                    <a
                      href={asset.file}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
                    >
                      Open file
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl rounded-2xl border border-orange-200/60 bg-orange-50/60 p-8 dark:border-orange-900/40 dark:bg-orange-950/20">
            <h2 className="mb-4 text-2xl font-semibold">Brand Guidelines</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <h3 className="font-semibold">Minimum clear space</h3>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Keep clear space around the logo equal to at least the height of the “R” mark on all sides.
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Prohibited edits</h3>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Do not stretch, rotate, recolor, add effects, or place the logo inside competing marks or shapes.
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Contrast guidance</h3>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Use high-contrast placements only. On dark backgrounds use light logo variants, and vice versa.
                </p>
              </div>
            </div>
            <div className="mt-8 rounded-lg border border-orange-300/70 bg-white p-5 dark:border-orange-700/50 dark:bg-gray-900">
              <h3 className="font-semibold">Download bundle</h3>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Need everything at once? Request the latest compressed brand bundle from our press team.
              </p>
              <a
                href="mailto:press@runash.in?subject=RunAsh%20Brand%20Bundle%20Request"
                className="mt-4 inline-flex items-center text-sm font-semibold text-orange-600 hover:underline dark:text-orange-400"
              >
                Email press@runash.in for the full bundle
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
