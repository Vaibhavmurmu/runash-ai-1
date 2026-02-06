"use client"

import type React from "react"

import { useState } from "react"
import { Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadZoneProps {
  onClose: () => void
}

export default function UploadZone({ onClose }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<any[]>([])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const newFiles = e.dataTransfer.files
    if (newFiles.length > 0) {
      Array.from(newFiles).forEach((file) => {
        setFiles((prev) => [
          ...prev,
          { id: Date.now(), name: file.name, size: file.size, progress: Math.random() * 100 },
        ])
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card p-4">
          <h2 className="text-lg font-semibold">Upload Files</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Drag Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            )}
          >
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium mb-1">Drag files here to upload</p>
            <p className="text-sm text-muted-foreground mb-4">or</p>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
              Browse Files
            </button>
            <p className="text-xs text-muted-foreground mt-4">Supported: MP4, WebM, PNG, JPG, GIF (Max 2GB)</p>
          </div>

          {/* Upload List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Uploading</h3>
              {files.map((file) => (
                <div key={file.id} className="bg-muted rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{Math.round(file.progress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-2 border-t border-border bg-card p-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded transition-colors">
            Cancel
          </button>
          <button className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded transition-colors">
            Upload & Process
          </button>
        </div>
      </div>
    </div>
  )
}
