"use client"

import { useRef, useState } from "react"
import { FileText, ImagePlus, Paperclip, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { SectionFeatureCard } from "@/components/settings/sections/section-feature-card"
import { SettingsRow } from "@/components/settings/sections/settings-presentation"
import type { AttachmentMetadata, SettingsData, SettingsSection } from "@/components/settings/types"

interface PreferencesSettingsProps {
  data: SettingsData
  isDisabled: boolean
  isSaving: boolean
  errors: Partial<Record<SettingsSection, string>>
  onFieldChange: <TSection extends SettingsSection, TField extends keyof SettingsData[TSection]>(
    section: TSection,
    field: TField,
    value: SettingsData[TSection][TField]
  ) => void
  onSave: (section: SettingsSection) => void
}

type UploadStatus = {
  progress: number
  error: string
}

const MAX_FEEDBACK_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_FEEDBACK_MIME_TYPES = ["application/pdf", "text/plain", "text/x-log"]

function isAllowedFeedbackFile(file: File) {
  return file.type.startsWith("image/") || ALLOWED_FEEDBACK_MIME_TYPES.includes(file.type)
}

function formatFileSize(sizeInBytes: number) {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
}

function toAttachmentMetadata(file: File): AttachmentMetadata {
  return {
    url: URL.createObjectURL(file),
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    uploadedAt: new Date().toISOString(),
  }
}

function attachmentIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return <ImagePlus className="h-4 w-4" />
  }

  if (mimeType === "application/pdf") {
    return <FileText className="h-4 w-4" />
  }

  return <Paperclip className="h-4 w-4" />
}

export function PreferencesSettings({ data, isDisabled, isSaving, errors, onFieldChange, onSave }: PreferencesSettingsProps) {
  const feedbackAttachmentRef = useRef<HTMLInputElement>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ progress: 0, error: "" })

  const handleFeedbackAttachment = async (file?: File) => {
    if (!file) {
      return
    }

    if (!isAllowedFeedbackFile(file)) {
      setUploadStatus({ progress: 0, error: "Only images, PDF, and plaintext log files are supported." })
      return
    }

    if (file.size > MAX_FEEDBACK_ATTACHMENT_SIZE_BYTES) {
      setUploadStatus({ progress: 0, error: "Attachment must be smaller than 10MB." })
      return
    }

    setUploadStatus({ progress: 12, error: "" })
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        setUploadStatus((prev) => {
          const next = Math.min(prev.progress + 18, 94)
          if (next >= 94) {
            clearInterval(timer)
            resolve()
          }

          return { ...prev, progress: next }
        })
      }, 75)
    })

    onFieldChange("preferences", "feedbackAttachments", [...data.preferences.feedbackAttachments, toAttachmentMetadata(file)])
    setUploadStatus({ progress: 100, error: "" })
    setTimeout(() => setUploadStatus({ progress: 0, error: "" }), 450)
  }

  const removeFeedbackAttachment = (index: number) => {
    const attachment = data.preferences.feedbackAttachments[index]
    if (attachment?.url.startsWith("blob:")) {
      URL.revokeObjectURL(attachment.url)
    }

    onFieldChange(
      "preferences",
      "feedbackAttachments",
      data.preferences.feedbackAttachments.filter((_, attachmentIndex) => attachmentIndex !== index),
    )
  }

  const isUploading = uploadStatus.progress > 0 && uploadStatus.progress < 100

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SectionFeatureCard
        panelId="notifications"
        title="Notifications"
        description="Choose which updates and announcements are sent to you."
        status="configured"
        actionLabel={isSaving ? "Saving..." : "Save notifications"}
        disabled={isDisabled}
        onAction={() => onSave("notifications")}
      >
        <SettingsRow title="Marketing emails" description="Receive announcements and launch updates.">
          <Switch
            checked={data.notifications.marketingEmailsEnabled}
            onCheckedChange={(checked) => onFieldChange("notifications", "marketingEmailsEnabled", checked)}
            disabled={isDisabled}
          />
        </SettingsRow>
        <SettingsRow title="Product updates" description="Get maintenance and release alerts.">
          <Switch
            checked={data.notifications.productUpdatesEnabled}
            onCheckedChange={(checked) => onFieldChange("notifications", "productUpdatesEnabled", checked)}
            disabled={isDisabled}
          />
        </SettingsRow>
        {errors.notifications ? <p className="text-sm text-destructive">{errors.notifications}</p> : null}
      </SectionFeatureCard>

      <SectionFeatureCard
        panelId="appearance"
        title="Theme / Language"
        description="Set your interface defaults across devices."
        status="configured"
        actionLabel={isSaving ? "Saving..." : "Save preferences"}
        disabled={isDisabled}
        onAction={() => onSave("preferences")}
      >
        <Select
          value={data.preferences.theme}
          onValueChange={(value) => onFieldChange("preferences", "theme", value as SettingsData["preferences"]["theme"])}
          disabled={isDisabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={data.preferences.language}
          onValueChange={(value) =>
            onFieldChange("preferences", "language", value as SettingsData["preferences"]["language"])
          }
          disabled={isDisabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Spanish</SelectItem>
            <SelectItem value="fr">French</SelectItem>
          </SelectContent>
        </Select>
        {errors.preferences ? <p className="text-sm text-destructive">{errors.preferences}</p> : null}
      </SectionFeatureCard>

      <SectionFeatureCard
        panelId="feedback"
        title="Feedback"
        description="Share workflow feedback to improve the product."
        status="review"
        actionLabel={isSaving ? "Saving..." : "Submit feedback"}
        disabled={isDisabled}
        onAction={() => onSave("preferences")}
      >
        <Textarea
          value={data.preferences.feedbackNotes}
          onChange={(event) => onFieldChange("preferences", "feedbackNotes", event.target.value)}
          placeholder="Tell us what should improve in settings"
          disabled={isDisabled}
        />

        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Feedback attachments (optional)</p>
              <p className="text-xs text-muted-foreground">Accepted: image, PDF, and .log/.txt files up to 10MB each.</p>
            </div>
            <input
              ref={feedbackAttachmentRef}
              type="file"
              accept="image/*,application/pdf,text/plain,.log"
              className="hidden"
              disabled={isDisabled}
              onChange={(event) => {
                void handleFeedbackAttachment(event.target.files?.[0])
                event.currentTarget.value = ""
              }}
            />
            <Button type="button" variant="outline" disabled={isDisabled} onClick={() => feedbackAttachmentRef.current?.click()}>
              <Paperclip className="mr-2 h-4 w-4" />
              Add file
            </Button>
          </div>

          {isUploading ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Uploading… {uploadStatus.progress}%</p>
              <div className="h-2 rounded bg-muted">
                <div className="h-2 rounded bg-primary" style={{ width: `${uploadStatus.progress}%` }} />
              </div>
            </div>
          ) : null}

          {uploadStatus.error ? <p className="text-xs text-destructive">{uploadStatus.error}</p> : null}

          <div className="space-y-2">
            {data.preferences.feedbackAttachments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No attachments selected.</p>
            ) : (
              data.preferences.feedbackAttachments.map((attachment, index) => (
                <div key={`${attachment.filename}-${attachment.uploadedAt}-${index}`} className="flex items-center justify-between rounded-md border p-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {attachmentIcon(attachment.mimeType)}
                    <span className="max-w-[220px] truncate">{attachment.filename}</span>
                    <span>{formatFileSize(attachment.size)}</span>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeFeedbackAttachment(index)} disabled={isDisabled}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </SectionFeatureCard>
    </div>
  )
}
