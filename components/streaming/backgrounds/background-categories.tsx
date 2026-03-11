"use client"

import type React from "react"
import { useEffect, useState } from "react"
import type { BackgroundCategory } from "@/types/virtual-backgrounds"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Briefcase, Mountain, PaintBucket, Palette, Monitor, ImageIcon, Sparkles, Building2, Landmark, Waves, Plus, Star, Trash2 } from "lucide-react"

interface BackgroundCategoriesProps {
  onCategorySelect: (categoryId: string) => void
  streamId?: string
}

export default function BackgroundCategories({ onCategorySelect, streamId = "studio-default" }: BackgroundCategoriesProps) {
  const [categories, setCategories] = useState<BackgroundCategory[]>([])
  const [newCategoryName, setNewCategoryName] = useState("")

  const load = async () => {
    const response = await fetch(`/api/streams/${streamId}/backgrounds/categories`, { cache: "no-store" })
    const payload = await response.json()
    if (response.ok) setCategories(payload.data?.categories ?? payload.categories ?? [])
  }

  useEffect(() => {
    void load()
  }, [streamId])

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      Briefcase: <Briefcase className="h-4 w-4" />,
      Mountain: <Mountain className="h-4 w-4" />,
      PaintBucket: <PaintBucket className="h-4 w-4" />,
      Palette: <Palette className="h-4 w-4" />,
      Monitor: <Monitor className="h-4 w-4" />,
      ImageIcon: <ImageIcon className="h-4 w-4" />,
      Sparkles: <Sparkles className="h-4 w-4" />,
      Building2: <Building2 className="h-4 w-4" />,
      Landmark: <Landmark className="h-4 w-4" />,
      Waves: <Waves className="h-4 w-4" />,
    }
    return icons[iconName] || <ImageIcon className="h-4 w-4" />
  }

  const createCategory = async () => {
    if (!newCategoryName.trim()) return
    const id = newCategoryName.toLowerCase().replace(/\s+/g, "-")
    await fetch(`/api/streams/${streamId}/backgrounds/categories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, name: newCategoryName.trim(), description: `${newCategoryName.trim()} backgrounds`, icon: "ImageIcon", count: 0, featured: true }),
    })
    setNewCategoryName("")
    await load()
  }

  const toggleFeatured = async (category: BackgroundCategory) => {
    await fetch(`/api/streams/${streamId}/backgrounds/categories/${category.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ featured: !category.featured }),
    })
    await load()
  }

  const deleteCategory = async (categoryId: string) => {
    await fetch(`/api/streams/${streamId}/backgrounds/categories/${categoryId}`, { method: "DELETE" })
    await load()
  }

  const featuredCategories = categories.filter((cat) => cat.featured)

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="New category" className="h-8" />
        <Button size="sm" onClick={() => void createCategory()}><Plus className="h-3 w-3" /></Button>
      </div>
      {featuredCategories.map((category) => (
        <div key={category.id} className="flex items-center gap-1">
          <Button variant="ghost" className="flex-1 justify-start" onClick={() => onCategorySelect(category.id)}>
            <div className="mr-2 text-orange-500">{getIconComponent(category.icon)}</div>
            <span className="flex-1 text-left">{category.name}</span>
            <span className="text-xs text-muted-foreground">{category.count}</span>
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void toggleFeatured(category)}><Star className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void deleteCategory(category.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      ))}
    </div>
  )
}
