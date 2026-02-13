export type DashboardStreamStatus =
  | "live"
  | "scheduled"
  | "ended"
  | "cancelled";

export interface DashboardRecentStream {
  id: string;
  title: string;
  category?: string;
  date: string;
  viewers: number;
  duration: string | null;
  url: string;
  status: DashboardStreamStatus;
}

export interface DashboardScheduledStream {
  id: string;
  title: string;
  description?: string;
  category?: string;
  startsAt: string;
  url?: string;
  status: Extract<DashboardStreamStatus, "scheduled" | "cancelled">;
  duration?: number;
  platforms?: string[];
  isRecurring?: boolean;
  recurrencePattern?: {
    frequency: "daily" | "weekly" | "monthly";
    interval: number;
    daysOfWeek?: number[];
    endDate?: string;
  };
  tags?: string[];
  isPublic?: boolean;
  notificationTime?: number;
  templateId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStreamTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  duration: number;
  platforms: string[];
  thumbnail?: string;
  tags: string[];
  category: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStreamDetails {
  id: string;
  title: string;
  category?: string;
  status: DashboardStreamStatus;
  url: string;
  startsAt?: string;
  startedAt?: string;
  viewers?: number;
  duration?: string | null;
}

export interface DashboardStreamDetailsResponse {
  stream: DashboardStreamDetails;
}

export interface StartStreamRequest {
  title: string;
  category?: string;
}

export interface StartStreamResponse {
  id: string;
  title: string;
  category?: string;
  url: string;
  status: Extract<DashboardStreamStatus, "live">;
  startedAt: string;
}

export interface ScheduleStreamRequest {
  title: string;
  category?: string;
  startsAt: string;
}

export interface ScheduleStreamResponse extends DashboardScheduledStream {}

export interface InviteCollaboratorRequest {
  streamId: string;
  email: string;
}

export interface InviteCollaboratorResponse {
  ok: true;
  inviteId: string;
  streamId: string;
  email: string;
  sentAt: string;
}

export interface IntegrationKeyResponse {
  rtmpKey: string;
}

export interface DashboardStreamsStore {
  recent: DashboardRecentStream[];
  scheduled: DashboardScheduledStream[];
  invites: Array<{
    id: string;
    streamId: string;
    email: string;
    sentAt: string;
  }>;
  templates?: DashboardStreamTemplate[];
}

export interface DashboardRecentStreamsResponse {
  streams: DashboardRecentStream[];
}

export interface DashboardScheduledStreamsResponse {
  streams: DashboardScheduledStream[];
}

export interface DashboardStreamTemplatesResponse {
  templates: DashboardStreamTemplate[];
}
