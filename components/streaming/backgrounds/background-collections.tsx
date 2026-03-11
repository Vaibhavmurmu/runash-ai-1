"use client"

import { useEffect, useState } from "react"
import type { BackgroundCollection } from "@/types/virtual-backgrounds"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, FolderPlus, Lock, Globe, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface BackgroundCollectionsProps {
  streamId?: string
}

export default function BackgroundCollections({ streamId = "studio-default" }: BackgroundCollectionsProps) {
  const { toast } = useToast()
  const [collections, setCollections] = useState<BackgroundCollection[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [newCollection, setNewCollection] = useState({ name: "", description: "", isPublic: true })

  const loadCollections = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/streams/${streamId}/backgrounds/collections`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message ?? "Failed to load collections")
      setCollections(payload.data?.collections ?? payload.collections ?? [])
    } catch (error) {
      toast({ title: "Failed to load collections", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadCollections()
  }, [streamId])

  const handleCreateCollection = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/backgrounds/collections`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          name: newCollection.name,
          description: newCollection.description,
          backgrounds: [],
          coverImage: "/placeholder.svg",
          isPublic: newCollection.isPublic,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message ?? "Failed to create collection")
      setCollections((prev) => [payload.data?.collection ?? payload.collection, ...prev])
      toast({ title: "Collection Created", description: `"${newCollection.name}" has been created successfully.` })
      setIsCreateDialogOpen(false)
      setNewCollection({ name: "", description: "", isPublic: true })
    } catch (error) {
      toast({ title: "Create failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" })
    }
  }

  const handleDeleteCollection = async (collectionId: string) => {
    try {
      const response = await fetch(`/api/streams/${streamId}/backgrounds/collections/${collectionId}`, { method: "DELETE" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message ?? "Failed to delete collection")
      setCollections((prev) => prev.filter((item) => item.id !== collectionId))
      toast({ title: "Collection Deleted", description: "The collection has been deleted successfully." })
    } catch (error) {
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Collections</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Collection
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading collections...</p> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map((collection) => (
          <Card key={collection.id} className="overflow-hidden">
            <div className="relative aspect-video">
              <img src={collection.coverImage || "/placeholder.svg"} alt={collection.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                <div>
                  <h3 className="font-semibold text-white">{collection.name}</h3>
                  <div className="flex items-center text-xs text-white/80 mt-1">
                    <span>{collection.backgrounds.length} backgrounds</span>
                    <span className="mx-1">•</span>
                    {collection.isPublic ? <div className="flex items-center"><Globe className="h-3 w-3 mr-1" /><span>Public</span></div> : <div className="flex items-center"><Lock className="h-3 w-3 mr-1" /><span>Private</span></div>}
                  </div>
                </div>
              </div>
            </div>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground line-clamp-2">{collection.description}</p>
              <div className="flex justify-end mt-4">
                <Button size="sm" variant="outline" onClick={() => void handleDeleteCollection(collection.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="overflow-hidden border-dashed">
          <div className="flex flex-col items-center justify-center h-full p-6 cursor-pointer" onClick={() => setIsCreateDialogOpen(true)}>
            <FolderPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium">Create New Collection</h3>
          </div>
        </Card>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
            <DialogDescription>Create a new collection to organize your backgrounds</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input value={newCollection.name} onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })} placeholder="Collection name" />
            <Textarea value={newCollection.description} onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })} placeholder="Describe your collection" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleCreateCollection()} disabled={!newCollection.name}>Create Collection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
