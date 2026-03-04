"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { LIBRARY_ITEMS } from "@/lib/workspace/project-library-domain"

export function DashboardLibraryPage() {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const filteredItems = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    if (!lowered) return LIBRARY_ITEMS
    return LIBRARY_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(lowered) ||
        item.description.toLowerCase().includes(lowered) ||
        item.tags.some((tag) => tag.toLowerCase().includes(lowered)),
    )
  }, [query])

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Project Library</h1>
        <p className="text-sm text-muted-foreground">Search reusable assets, datasets, and prompts.</p>
      </div>

      <Input placeholder="Search library..." value={query} onChange={(event) => setQuery(event.target.value)} />

      <div className="grid gap-4 md:grid-cols-2">
        {filteredItems.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>{item.title}</span>
                <Badge variant="outline">{item.type}</Badge>
              </CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    router.push(`/dashboard/editor?libraryItemId=${encodeURIComponent(item.id)}&libraryItemTitle=${encodeURIComponent(item.title)}`)
                  }
                >
                  Open in editor
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/dashboard/streaming-studio?libraryItemId=${encodeURIComponent(item.id)}&libraryItemTitle=${encodeURIComponent(item.title)}`,
                    )
                  }
                >
                  Open in streaming
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
