import Link from "next/link"
import { SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
      <Card className="w-full max-w-xl border-orange-100 bg-white/90 dark:border-white/10 dark:bg-white/[0.03]">
        <CardContent className="py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40">
            <SearchX className="h-7 w-7 text-orange-600 dark:text-orange-300" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Page not found</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            The page may have moved or the link may be incorrect. Explore core RunAsh AI sections below.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white">
              <Link href="/">Go to Home</Link>
            </Button>
            <Button asChild variant="outline" className="border-orange-500 text-orange-700 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-950">
              <Link href="/features">View Features</Link>
            </Button>
            <Button asChild variant="outline" className="border-orange-500 text-orange-700 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-950">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
