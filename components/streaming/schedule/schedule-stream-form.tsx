"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Clock, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ScheduledStream,
  StreamFrequency,
  StreamTemplate,
} from "@/types/stream-scheduler";

interface ScheduleStreamFormProps {
  isOpen: boolean;
  initialData?: Partial<ScheduledStream>;
  initialDate?: Date;
  platforms: { id: string; name: string; platform: string }[];
  templates: StreamTemplate[];
  onClose: () => void;
  onSave: (data: Partial<ScheduledStream>) => void;
}

export default function ScheduleStreamForm({
  isOpen,
  initialData,
  initialDate,
  platforms,
  templates,
  onClose,
  onSave,
}: ScheduleStreamFormProps) {
  const [formData, setFormData] = useState<Partial<ScheduledStream>>({
    title: "",
    description: "",
    scheduledDate: initialDate
      ? initialDate.toISOString()
      : new Date().toISOString(),
    duration: 60,
    platforms: [],
    isRecurring: false,
    tags: [],
    category: "Gaming",
    isPublic: true,
    notificationTime: 15,
    ...initialData,
  });

  const [date, setDate] = useState<Date | undefined>(
    initialDate ||
      (initialData?.scheduledDate
        ? new Date(initialData.scheduledDate)
        : new Date()),
  );
  const [time, setTime] = useState(() => {
    const source = initialData?.scheduledDate || initialDate?.toISOString();
    if (!source) return "18:00";
    const parsed = new Date(source);
    return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
  });
  const [frequency, setFrequency] = useState<StreamFrequency>(
    initialData?.isRecurring
      ? initialData?.recurrencePattern?.frequency === "daily"
        ? "daily"
        : initialData?.recurrencePattern?.frequency === "weekly"
          ? "weekly"
          : "monthly"
      : "once",
  );
  const [selectedDays, setSelectedDays] = useState<number[]>(
    initialData?.recurrencePattern?.daysOfWeek || [],
  );
  const [tagInput, setTagInput] = useState("");

  // Update scheduledDate when date or time changes
  useEffect(() => {
    if (date) {
      const [hours, minutes] = time.split(":").map(Number);
      const newDate = new Date(date);
      newDate.setHours(hours, minutes, 0, 0);
      setFormData((prev) => ({
        ...prev,
        scheduledDate: newDate.toISOString(),
      }));
    }
  }, [date, time]);

  // Update recurrence pattern when frequency or days change
  useEffect(() => {
    if (frequency === "once") {
      setFormData((prev) => ({
        ...prev,
        isRecurring: false,
        recurrencePattern: undefined,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        isRecurring: true,
        recurrencePattern: {
          frequency:
            frequency === "daily"
              ? "daily"
              : frequency === "weekly"
                ? "weekly"
                : "monthly",
          interval: 1,
          daysOfWeek: frequency === "weekly" ? selectedDays : undefined,
        },
      }));
    }
  }, [frequency, selectedDays]);

  useEffect(() => {
    if (!isOpen) return;

    const seedDate =
      initialDate ||
      (initialData?.scheduledDate
        ? new Date(initialData.scheduledDate)
        : new Date());
    const seedTimeSource = initialData?.scheduledDate || seedDate.toISOString();
    const seedTimeDate = new Date(seedTimeSource);

    setFormData({
      title: "",
      description: "",
      scheduledDate: seedDate.toISOString(),
      duration: 60,
      platforms: [],
      isRecurring: false,
      tags: [],
      category: "Gaming",
      isPublic: true,
      notificationTime: 15,
      ...initialData,
    });
    setDate(seedDate);
    setTime(
      `${String(seedTimeDate.getHours()).padStart(2, "0")}:${String(seedTimeDate.getMinutes()).padStart(2, "0")}`,
    );
    setFrequency(
      initialData?.isRecurring
        ? initialData?.recurrencePattern?.frequency === "daily"
          ? "daily"
          : initialData?.recurrencePattern?.frequency === "weekly"
            ? "weekly"
            : "monthly"
        : "once",
    );
    setSelectedDays(initialData?.recurrencePattern?.daysOfWeek || []);
  }, [initialData, initialDate, isOpen]);

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    if (templateId === "none") {
      return;
    }

    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setFormData((prev) => ({
        ...prev,
        title: template.title,
        description: template.description,
        duration: template.duration,
        category: template.category,
        isPublic: template.isPublic,
        platforms: template.platforms,
        tags: template.tags,
        templateId,
      }));
    }
  };

  // Handle tag input
  const handleAddTag = () => {
    if (tagInput && !formData.tags?.includes(tagInput)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? "Edit Scheduled Stream" : "Schedule New Stream"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="template">Use Template (Optional)</Label>
                <Select
                  onValueChange={handleTemplateChange}
                  defaultValue="none"
                >
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Template</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Stream Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter a title for your stream"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe your stream"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-gray-500" />
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="5"
                max="480"
                value={formData.duration}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    duration: Number.parseInt(e.target.value),
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <RadioGroup
                value={frequency}
                onValueChange={(value) =>
                  setFrequency(value as StreamFrequency)
                }
              >
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="once" id="once" />
                    <Label htmlFor="once">One-time</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="daily" />
                    <Label htmlFor="daily">Daily</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weekly" id="weekly" />
                    <Label htmlFor="weekly">Weekly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly">Monthly</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {frequency === "weekly" && (
              <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="flex flex-wrap gap-2">
                  {weekdays.map((day, index) => (
                    <div key={day} className="flex items-center">
                      <Checkbox
                        id={`day-${index}`}
                        checked={selectedDays.includes(index)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDays([...selectedDays, index]);
                          } else {
                            setSelectedDays(
                              selectedDays.filter((d) => d !== index),
                            );
                          }
                        }}
                        className="mr-1"
                      />
                      <Label htmlFor={`day-${index}`} className="text-sm">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Platforms</Label>
              <div className="grid grid-cols-2 gap-2">
                {platforms.map((platform) => (
                  <div
                    key={platform.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`platform-${platform.id}`}
                      checked={(formData.platforms || []).includes(platform.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData((prev) => ({
                            ...prev,
                            platforms: [...(prev.platforms || []), platform.id],
                          }));
                        } else {
                          setFormData((prev) => ({
                            ...prev,
                            platforms: (prev.platforms || []).filter(
                              (p) => p !== platform.id,
                            ),
                          }));
                        }
                      }}
                    />
                    <Label htmlFor={`platform-${platform.id}`}>
                      {platform.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gaming">Gaming</SelectItem>
                  <SelectItem value="Just Chatting">Just Chatting</SelectItem>
                  <SelectItem value="Music">Music</SelectItem>
                  <SelectItem value="Art">Art</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Science & Technology">
                    Science & Technology
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddTag} className="ml-2">
                  Add
                </Button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <div
                      key={tag}
                      className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-1 rounded-full text-xs flex items-center"
                    >
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 hover:bg-orange-200 dark:hover:bg-orange-800"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification">
                Notification (minutes before stream)
              </Label>
              <Select
                value={formData.notificationTime.toString()}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    notificationTime: Number.parseInt(value),
                  }))
                }
              >
                <SelectTrigger id="notification">
                  <SelectValue placeholder="Select notification time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes before</SelectItem>
                  <SelectItem value="15">15 minutes before</SelectItem>
                  <SelectItem value="30">30 minutes before</SelectItem>
                  <SelectItem value="60">1 hour before</SelectItem>
                  <SelectItem value="120">2 hours before</SelectItem>
                  <SelectItem value="1440">1 day before</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="public" className="cursor-pointer">
                Public Stream
              </Label>
              <Switch
                id="public"
                checked={formData.isPublic}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isPublic: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter className="flex space-x-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:opacity-90"
            >
              <Save className="h-4 w-4 mr-2" />
              {initialData?.id ? "Update" : "Schedule"} Stream
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
