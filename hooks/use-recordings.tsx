"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useToast } from "@/hooks/use-toast"

export interface Recording {
  id: string
  title: string
  description: string
  streamId: string
  duration: number
  quality: string
  timestamp: string
  thumbnail: string
  size: number // in MB
  views: number
  tags?: string[]
  isProcessing?: boolean
}

interface RecordingsContextType {
  recordings: Recording[]
  addRecording: (recording: Recording) => void
  updateRecording: (id: string, updates: Partial<Recording>) => void
  deleteRecording: (id: string) => void
  getRecording: (id: string) => Recording | undefined
  incrementViews: (id: string) => void
}

const RecordingsContext = createContext<RecordingsContextType | undefined>(undefined)

export function RecordingsProvider({ children }: { children: ReactNode }) {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const { toast } = useToast()

  // Load recordings from localStorage on mount
  useEffect(() => {
    const storedRecordings = localStorage.getItem("recordings")
    if (storedRecordings) {
      try {
        setRecordings(JSON.parse(storedRecordings))
      } catch (error) {
        console.error("Failed to parse recordings from localStorage:", error)
      }
    }
  }, [])

  // Save recordings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("recordings", JSON.stringify(recordings))
  }, [recordings])

  // Add a new recording
  const addRecording = (recording: Recording) => {
    // Simulate processing time for the recording
    const processingRecording = { ...recording, isProcessing: true }
    setRecordings((prev) => [processingRecording, ...prev])

    // Simulate processing completion after a delay
    setTimeout(() => {
      setRecordings((prev) => prev.map((rec) => (rec.id === recording.id ? { ...rec, isProcessing: false } : rec)))

      toast({
        title: "Recording processed",
        description: `"${recording.title}" is now ready to view.`,
        variant: "success",
      })
    }, 5000) // 5 seconds processing time
  }

  // Update an existing recording
  const updateRecording = (id: string, updates: Partial<Recording>) => {
    setRecordings((prev) => prev.map((recording) => (recording.id === id ? { ...recording, ...updates } : recording)))
  }

  // Delete a recording
  const deleteRecording = (id: string) => {
    const recordingToDelete = recordings.find((rec) => rec.id === id)
    if (!recordingToDelete) return

    setRecordings((prev) => prev.filter((recording) => recording.id !== id))

    toast({
      title: "Recording deleted",
      description: `"${recordingToDelete.title}" has been deleted.`,
    })
  }

  // Get a recording by ID
  const getRecording = (id: string) => {
    return recordings.find((recording) => recording.id === id)
  }

  // Increment view count for a recording
  const incrementViews = (id: string) => {
    setRecordings((prev) =>
      prev.map((recording) => (recording.id === id ? { ...recording, views: recording.views + 1 } : recording)),
    )
  }

  return (
    <RecordingsContext.Provider
      value={{
        recordings,
        addRecording,
        updateRecording,
        deleteRecording,
        getRecording,
        incrementViews,
      }}
    >
      {children}
    </RecordingsContext.Provider>
  )
}

export function useRecordings() {
  const context = useContext(RecordingsContext)
  if (context === undefined) {
    throw new Error("useRecordings must be used within a RecordingsProvider")
  }
  return context
}
