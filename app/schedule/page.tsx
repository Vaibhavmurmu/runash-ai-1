"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, CalendarIcon, ListFilter } from "lucide-react";
import StreamCalendar from "@/components/streaming/schedule/stream-calendar";
import UpcomingStreams from "@/components/streaming/schedule/upcoming-streams";
import StreamTemplates from "@/components/streaming/schedule/stream-templates";
import ScheduleStreamForm from "@/components/streaming/schedule/schedule-stream-form";
import StreamNotification from "@/components/streaming/schedule/stream-notification";
import type {
  ScheduledStream,
  StreamTemplate,
  CalendarEvent,
} from "@/types/stream-scheduler";
import type {
  DashboardScheduledStream,
  DashboardStreamTemplate,
} from "@/lib/types/dashboard-streams";

const mockPlatforms = [
  { id: "twitch-1", name: "My Twitch Channel", platform: "twitch" },
  { id: "youtube-1", name: "YouTube Gaming", platform: "youtube" },
  { id: "facebook-1", name: "Facebook Gaming", platform: "facebook" },
];

type TemplateForm = {
  name: string;
  title: string;
  description: string;
  duration: number;
  category: string;
  isPublic: boolean;
};

type DurableSchedule = {
  id: string;
  name: string;
  frequency: "hourly" | "daily" | "weekly" | "monthly";
  format: "CSV" | "PDF" | "Excel";
  jobType: "report_generation" | "notification_dispatch" | "support_bot_automation";
  recipients?: string;
  nextRun: string | null;
  lastRun: string | null;
  lastStatus: "queued" | "processing" | "succeeded" | "failed" | null;
  lastError: string | null;
};


const defaultTemplateForm: TemplateForm = {
  name: "",
  title: "",
  description: "",
  duration: 60,
  category: "Gaming",
  isPublic: true,
};

function toScheduledStream(stream: DashboardScheduledStream): ScheduledStream {
  return {
    id: stream.id,
    title: stream.title,
    description: stream.description ?? "",
    scheduledDate: stream.startsAt,
    duration: stream.duration ?? 60,
    platforms: stream.platforms ?? [],
    isRecurring: stream.isRecurring ?? false,
    recurrencePattern: stream.recurrencePattern,
    tags: stream.tags ?? [],
    category: stream.category ?? "Gaming",
    isPublic: stream.isPublic ?? true,
    notificationTime: stream.notificationTime ?? 15,
    templateId: stream.templateId,
    createdAt: stream.createdAt ?? new Date().toISOString(),
    updatedAt: stream.updatedAt ?? new Date().toISOString(),
  };
}

function toTemplate(template: DashboardStreamTemplate): StreamTemplate {
  return {
    id: template.id,
    name: template.name,
    title: template.title,
    description: template.description,
    duration: template.duration,
    platforms: template.platforms,
    thumbnail: template.thumbnail,
    tags: template.tags,
    category: template.category,
    isPublic: template.isPublic,
  };
}

export default function SchedulePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("calendar");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<ScheduledStream | null>(
    null,
  );
  const [initialDate, setInitialDate] = useState<Date | null>(null);
  const [streams, setStreams] = useState<ScheduledStream[]>([]);
  const [templates, setTemplates] = useState<StreamTemplate[]>([]);
  const [streamsLoading, setStreamsLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [streamsError, setStreamsError] = useState<string | null>(null);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [streamActionLoading, setStreamActionLoading] = useState(false);
  const [templateActionLoadingId, setTemplateActionLoadingId] = useState<
    string | null
  >(null);
  const [showNotification, setShowNotification] = useState(false);
  const [upcomingStream, setUpcomingStream] = useState<ScheduledStream | null>(
    null,
  );
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<StreamTemplate | null>(
    null,
  );
  const [templateForm, setTemplateForm] =
    useState<TemplateForm>(defaultTemplateForm);
  const [templateSaveLoading, setTemplateSaveLoading] = useState(false);
  const [durableSchedules, setDurableSchedules] = useState<DurableSchedule[]>([]);
  const [durableScheduleLoading, setDurableScheduleLoading] = useState(true);
  const [durableScheduleError, setDurableScheduleError] = useState<string | null>(null);

  const loadStreams = async () => {
    setStreamsLoading(true);
    setStreamsError(null);
    try {
      const response = await fetch("/api/dashboard/streams/scheduled");
      if (!response.ok) throw new Error("Failed to load scheduled streams");
      const payload = (await response.json()) as {
        streams: DashboardScheduledStream[];
      };
      const mappedStreams = payload.streams.map(toScheduledStream);
      setStreams(mappedStreams);
      const nextStream = [...mappedStreams]
        .filter(
          (stream) => new Date(stream.scheduledDate).getTime() > Date.now(),
        )
        .sort(
          (a, b) =>
            new Date(a.scheduledDate).getTime() -
            new Date(b.scheduledDate).getTime(),
        )[0];
      setUpcomingStream(nextStream ?? null);
      setShowNotification(Boolean(nextStream));
    } catch (error) {
      setStreamsError(
        error instanceof Error ? error.message : "Failed to load streams",
      );
    } finally {
      setStreamsLoading(false);
    }
  };

  const loadDurableSchedules = async () => {
    setDurableScheduleLoading(true);
    setDurableScheduleError(null);
    try {
      const response = await fetch("/api/analytics/schedules");
      if (!response.ok) throw new Error("Failed to load durable schedules");
      const payload = (await response.json()) as DurableSchedule[];
      setDurableSchedules(payload);
    } catch (error) {
      setDurableScheduleError(
        error instanceof Error ? error.message : "Failed to load durable schedules",
      );
    } finally {
      setDurableScheduleLoading(false);
    }
  };

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const response = await fetch("/api/dashboard/streams/templates");
      if (!response.ok) throw new Error("Failed to load templates");
      const payload = (await response.json()) as {
        templates: DashboardStreamTemplate[];
      };
      setTemplates(payload.templates.map(toTemplate));
    } catch (error) {
      setTemplatesError(
        error instanceof Error ? error.message : "Failed to load templates",
      );
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    loadStreams();
    loadTemplates();
    loadDurableSchedules();
  }, []);

  const calendarEvents: CalendarEvent[] = useMemo(
    () =>
      streams.map((stream) => {
        const start = new Date(stream.scheduledDate);
        const end = new Date(start.getTime() + stream.duration * 60000);

        return {
          id: stream.id,
          title: stream.title,
          start,
          end,
          platforms: stream.platforms,
          color: stream.isRecurring ? "#8b5cf6" : "#f97316",
        };
      }),
    [streams],
  );

  const handleCreateStream = () => {
    setEditingStream(null);
    setInitialDate(null);
    setIsFormOpen(true);
  };

  const handleEditStream = (stream: ScheduledStream) => {
    setEditingStream(stream);
    setInitialDate(null);
    setIsFormOpen(true);
  };

  const handleDeleteStream = async (streamId: string) => {
    setStreamActionLoading(true);
    setStreamsError(null);
    try {
      const response = await fetch(
        `/api/dashboard/streams/schedule/${streamId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Failed to delete stream");
      await loadStreams();
    } catch (error) {
      setStreamsError(
        error instanceof Error ? error.message : "Failed to delete stream",
      );
    } finally {
      setStreamActionLoading(false);
    }
  };

  const handleDuplicateStream = (stream: ScheduledStream) => {
    const duplicate: ScheduledStream = {
      ...stream,
      id: "",
      title: `${stream.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingStream(duplicate);
    setIsFormOpen(true);
  };

  const handleSaveStream = async (data: Partial<ScheduledStream>) => {
    setStreamActionLoading(true);
    setStreamsError(null);

    const startsAt = data.scheduledDate
      ? new Date(data.scheduledDate).toISOString()
      : new Date().toISOString();
    const payload = {
      title: data.title || "Untitled Stream",
      description: data.description || "",
      startsAt,
      category: data.category || "Gaming",
      duration: data.duration || 60,
      platforms: data.platforms || [],
      isRecurring: data.isRecurring || false,
      recurrencePattern: data.recurrencePattern,
      tags: data.tags || [],
      isPublic: data.isPublic ?? true,
      notificationTime: data.notificationTime || 15,
      templateId: data.templateId,
    };

    try {
      if (editingStream?.id) {
        const response = await fetch(
          `/api/dashboard/streams/schedule/${editingStream.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        if (!response.ok) throw new Error("Failed to update stream");
      } else {
        const response = await fetch("/api/dashboard/streams/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Failed to schedule stream");
      }

      await loadStreams();
      setIsFormOpen(false);
      setEditingStream(null);
      setInitialDate(null);
    } catch (error) {
      setStreamsError(
        error instanceof Error ? error.message : "Failed to save stream",
      );
    } finally {
      setStreamActionLoading(false);
    }
  };

  const handleSelectCalendarSlot = (slotInfo: { start: Date }) => {
    setEditingStream(null);
    setInitialDate(slotInfo.start);
    setIsFormOpen(true);
  };

  const handleSelectCalendarEvent = (event: CalendarEvent) => {
    const stream = streams.find((item) => item.id === event.id);
    if (stream) {
      handleEditStream(stream);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm(defaultTemplateForm);
    setIsTemplateModalOpen(true);
  };

  const handleEditTemplate = (template: StreamTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      title: template.title,
      description: template.description,
      duration: template.duration,
      category: template.category,
      isPublic: template.isPublic,
    });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    setTemplateSaveLoading(true);
    setTemplatesError(null);
    try {
      const payload = {
        ...templateForm,
        platforms:
          editingTemplate?.platforms ??
          mockPlatforms.map((platform) => platform.id),
        tags: editingTemplate?.tags ?? [],
      };

      const response = await fetch(
        editingTemplate
          ? `/api/dashboard/streams/templates/${editingTemplate.id}`
          : "/api/dashboard/streams/templates",
        {
          method: editingTemplate ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok)
        throw new Error(
          editingTemplate
            ? "Failed to update template"
            : "Failed to create template",
        );

      await loadTemplates();
      setIsTemplateModalOpen(false);
      setEditingTemplate(null);
      setTemplateForm(defaultTemplateForm);
    } catch (error) {
      setTemplatesError(
        error instanceof Error ? error.message : "Failed to save template",
      );
    } finally {
      setTemplateSaveLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    setTemplateActionLoadingId(templateId);
    setTemplatesError(null);
    try {
      const response = await fetch(
        `/api/dashboard/streams/templates/${templateId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Failed to delete template");
      await loadTemplates();
    } catch (error) {
      setTemplatesError(
        error instanceof Error ? error.message : "Failed to delete template",
      );
    } finally {
      setTemplateActionLoadingId(null);
    }
  };

  const handleUseTemplate = (template: StreamTemplate) => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);

    setEditingStream({
      id: "",
      title: template.title,
      description: template.description,
      scheduledDate: now.toISOString(),
      duration: template.duration,
      platforms: template.platforms,
      isRecurring: false,
      tags: template.tags,
      category: template.category,
      isPublic: template.isPublic,
      notificationTime: 15,
      templateId: template.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setInitialDate(now);
    setIsFormOpen(true);
  };

  const handleDismissNotification = () => {
    setShowNotification(false);
  };

  const handleGoToStudio = (stream: ScheduledStream) => {
    router.push(`/studio?streamId=${encodeURIComponent(stream.id)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Stream Scheduler</h1>
          <Button
            onClick={handleCreateStream}
            className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Stream
          </Button>
        </div>

        {(streamsError || templatesError || durableScheduleError) && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {streamsError || templatesError || durableScheduleError}
          </div>
        )}

        <div className="mb-6 rounded-lg border bg-white/70 p-4 shadow-sm dark:bg-gray-900/70">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Durable job schedule health
            </h2>
            <Button variant="outline" size="sm" onClick={loadDurableSchedules}>
              Refresh
            </Button>
          </div>
          {durableScheduleLoading ? (
            <p className="text-sm text-muted-foreground">Loading durable scheduler state...</p>
          ) : durableSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No durable schedules configured yet.</p>
          ) : (
            <div className="space-y-2">
              {durableSchedules.map((schedule) => (
                <div key={schedule.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{schedule.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {schedule.jobType.replaceAll("_", " ")} • {schedule.frequency}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last run: {schedule.lastRun ? new Date(schedule.lastRun).toLocaleString() : "Never"} • Next run: {schedule.nextRun ? new Date(schedule.nextRun).toLocaleString() : "Not queued"}
                  </p>
                  <p className="mt-1 text-xs">
                    Status: <span className="font-medium">{schedule.lastStatus ?? "not started"}</span>
                    {schedule.lastError ? ` • Error: ${schedule.lastError}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="calendar" className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center">
                <ListFilter className="h-4 w-4 mr-2" />
                List View
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="calendar" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-[700px]">
                {streamsLoading ? (
                  <div className="text-sm text-muted-foreground p-6">
                    Loading schedule...
                  </div>
                ) : (
                  <StreamCalendar
                    events={calendarEvents}
                    onSelectEvent={handleSelectCalendarEvent}
                    onSelectSlot={handleSelectCalendarSlot}
                  />
                )}
              </div>
              <div className="h-[700px]">
                <StreamTemplates
                  templates={templates}
                  isLoading={templatesLoading}
                  error={templatesError}
                  deletingTemplateId={templateActionLoadingId}
                  onCreateTemplate={handleCreateTemplate}
                  onEditTemplate={handleEditTemplate}
                  onDeleteTemplate={handleDeleteTemplate}
                  onUseTemplate={handleUseTemplate}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-0">
            <div className="h-[700px]">
              {streamsLoading ? (
                <div className="text-sm text-muted-foreground p-6">
                  Loading streams...
                </div>
              ) : (
                <UpcomingStreams
                  streams={streams}
                  onEdit={handleEditStream}
                  onDelete={handleDeleteStream}
                  onDuplicate={handleDuplicateStream}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>

        <ScheduleStreamForm
          isOpen={isFormOpen}
          initialData={editingStream || undefined}
          initialDate={initialDate || undefined}
          platforms={mockPlatforms}
          templates={templates}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveStream}
        />

        <Dialog
          open={isTemplateModalOpen}
          onOpenChange={setIsTemplateModalOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Create Template"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateForm.name}
                  onChange={(event) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="template-title">Stream Title</Label>
                <Input
                  id="template-title"
                  value={templateForm.title}
                  onChange={(event) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={templateForm.description}
                  onChange={(event) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="template-duration">Duration (minutes)</Label>
                <Input
                  id="template-duration"
                  type="number"
                  min={5}
                  value={templateForm.duration}
                  onChange={(event) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      duration:
                        Number.parseInt(event.target.value || "0", 10) || 60,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="template-public">Public template</Label>
                <Switch
                  id="template-public"
                  checked={templateForm.isPublic}
                  onCheckedChange={(checked) =>
                    setTemplateForm((prev) => ({ ...prev, isPublic: checked }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsTemplateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={templateSaveLoading}
              >
                {templateSaveLoading
                  ? "Saving..."
                  : editingTemplate
                    ? "Save changes"
                    : "Create template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {showNotification && upcomingStream && (
          <div className="fixed bottom-4 right-4 w-80 z-50">
            <StreamNotification
              stream={upcomingStream}
              onDismiss={handleDismissNotification}
              onGoToStudio={handleGoToStudio}
            />
          </div>
        )}

        {streamActionLoading && (
          <div className="mt-4 text-sm text-muted-foreground">
            Saving stream changes...
          </div>
        )}
      </div>
    </div>
  );
}
