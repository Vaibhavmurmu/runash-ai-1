"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Upload, X, ImageIcon, FileText, Check, Trash2 } from "lucide-react"
import { useStreamBackgrounds } from "@/hooks/use-stream-backgrounds"

export default function BackgroundUploader() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [uploadStatus, setUploadStatus] = useState<Record<string, "pending" | "uploading" | "complete" | "error">>({})
  const [metadata, setMetadata] = useState({ name: "", category: "", tags: "", isPublic: true })
  const { data: existing, loading, error, upload, remove } = useStreamBackgrounds("studio-default")

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const newFiles = Array.from(e.target.files)
    setUploadedFiles((prev) => [...prev, ...newFiles])

    const newProgress: Record<string, number> = {}
    const newStatus: Record<string, "pending" | "uploading" | "complete" | "error"> = {}

    newFiles.forEach((file) => {
      newProgress[file.name] = 0
      newStatus[file.name] = "pending"
    })

    setUploadProgress((prev) => ({ ...prev, ...newProgress }))
    setUploadStatus((prev) => ({ ...prev, ...newStatus }))
  }

  const removeFile = (fileName: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.name !== fileName))
    const newProgress = { ...uploadProgress }
    const newStatus = { ...uploadStatus }
    delete newProgress[fileName]
    delete newStatus[fileName]
    setUploadProgress(newProgress)
    setUploadStatus(newStatus)
  }

  const uploadFiles = async () => {
    if (uploadedFiles.length === 0) return

    for (const file of uploadedFiles) {
      try {
        setUploadStatus((prev) => ({ ...prev, [file.name]: "uploading" }))
        setUploadProgress((prev) => ({ ...prev, [file.name]: 30 }))

        const fileAsDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error("Could not read image"))
          reader.readAsDataURL(file)
        })

        await upload({
          id: `upload-${Date.now()}-${file.name}`,
          name: metadata.name || file.name.replace(/\.[^/.]+$/, ""),
          url: fileAsDataUrl,
          thumbnailUrl: fileAsDataUrl,
          category: metadata.category ? [metadata.category] : ["custom"],
          tags: metadata.tags ? metadata.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
          isPremium: false,
          isPublic: metadata.isPublic,
        })

        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }))
        setUploadStatus((prev) => ({ ...prev, [file.name]: "complete" }))
      } catch {
        setUploadStatus((prev) => ({ ...prev, [file.name]: "error" }))
      }
    }

    toast({ title: "Upload complete", description: "Background assets synced to your stream." })
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "")) {
      return <ImageIcon className="h-6 w-6 text-blue-500" />
    }
    return <FileText className="h-6 w-6 text-gray-500" />
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Upload Backgrounds</h2>
        <p className="text-muted-foreground">Upload your own background images to use in your streams</p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading existing uploads...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {!loading && existing.length === 0 ? <p className="text-sm text-muted-foreground">No uploaded backgrounds yet.</p> : null}

      {existing.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {existing.slice(0, 8).map((asset) => (
            <div key={asset.id} className="relative border rounded-md overflow-hidden">
              <img src={asset.thumbnailUrl || asset.url} alt={asset.name} className="h-20 w-full object-cover" />
              <button className="absolute top-1 right-1 rounded bg-white/80 p-1" onClick={() => void remove(asset.id)}>
                <Trash2 className="h-3 w-3 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Card>
            <CardContent className="p-6">
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-colors" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="font-medium text-center">Drag and drop your files here</h3>
                <p className="text-sm text-muted-foreground text-center mt-2">or click to browse your files</p>
                <p className="text-xs text-muted-foreground text-center mt-4">Supports JPG, PNG, WEBP • Max 10MB per file</p>
                <Input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="font-medium">Files to Upload ({uploadedFiles.length})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {uploadedFiles.map((file) => (
                      <div key={file.name} className="flex items-center p-2 border rounded-lg">
                        <div className="mr-2">{getFileIcon(file.name)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${uploadProgress[file.name] || 0}%` }}></div>
                          </div>
                        </div>
                        <div className="ml-2 flex items-center">
                          {uploadStatus[file.name] === "complete" ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <button onClick={() => removeFile(file.name)}>
                              <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-medium">Background Details</h3>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={metadata.name} onChange={(e) => setMetadata({ ...metadata, name: e.target.value })} placeholder="My Background" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select id="category" value={metadata.category} onChange={(e) => setMetadata({ ...metadata, category: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <option value="">Select a category</option>
                  <option value="office">Office</option>
                  <option value="nature">Nature</option>
                  <option value="abstract">Abstract</option>
                  <option value="gradients">Gradients</option>
                  <option value="tech">Tech</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input id="tags" value={metadata.tags} onChange={(e) => setMetadata({ ...metadata, tags: e.target.value })} placeholder="professional, clean, modern" />
              </div>

              <div className="flex items-center space-x-2">
                <input type="checkbox" id="isPublic" checked={metadata.isPublic} onChange={(e) => setMetadata({ ...metadata, isPublic: e.target.checked })} className="rounded border-gray-300" />
                <Label htmlFor="isPublic">Make backgrounds public in the community library</Label>
              </div>

              <Button className="w-full mt-4 bg-gradient-to-r from-orange-600 to-yellow-500 hover:opacity-90 text-white" onClick={() => void uploadFiles()} disabled={uploadedFiles.length === 0}>
                Upload Backgrounds
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
