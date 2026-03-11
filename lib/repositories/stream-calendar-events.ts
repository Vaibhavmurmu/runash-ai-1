import { queryMany } from "@/lib/db"

export type StreamCalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  color?: string
  platforms: string[]
}

export type StreamCalendarEventFilters = {
  start?: Date
  end?: Date
  userId?: string
  workspace?: string
  platforms?: string[]
}

type StreamCalendarEventRow = {
  id: string
  title: string
  start_at: string
  end_at: string
  settings: Record<string, unknown> | string | null
}

function parseSettings(settings: StreamCalendarEventRow["settings"]): Record<string, unknown> {
  if (!settings) return {}
  if (typeof settings === "string") {
    try {
      return JSON.parse(settings) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  return settings
}

function normalizePlatforms(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
}

export async function listStreamCalendarEvents(filters: StreamCalendarEventFilters): Promise<StreamCalendarEvent[]> {
  const clauses: string[] = ["1=1"]
  const values: unknown[] = []

  if (filters.userId) {
    values.push(filters.userId)
    clauses.push(`user_id = $${values.length}`)
  }

  if (filters.start) {
    values.push(filters.start.toISOString())
    clauses.push(`coalesce(scheduled_start, actual_start, created_at) >= $${values.length}::timestamptz`)
  }

  if (filters.end) {
    values.push(filters.end.toISOString())
    clauses.push(`coalesce(scheduled_start, actual_start, created_at) <= $${values.length}::timestamptz`)
  }

  if (filters.workspace) {
    values.push(filters.workspace)
    clauses.push(`coalesce(settings::jsonb->>'workspaceId', settings::jsonb->>'workspace', '') = $${values.length}`)
  }

  const rows = await queryMany<StreamCalendarEventRow>(
    `
      select
        id,
        title,
        coalesce(scheduled_start, actual_start, created_at) as start_at,
        coalesce(
          actual_end,
          scheduled_start + interval '1 hour',
          actual_start + interval '1 hour',
          created_at + interval '1 hour'
        ) as end_at,
        settings
      from streams
      where ${clauses.join(" and ")}
    `,
    values,
  )

  const requestedPlatforms = (filters.platforms ?? []).map((platform) => platform.toLowerCase())

  return rows
    .map((row) => {
      const settings = parseSettings(row.settings)
      const platforms = normalizePlatforms(settings.platforms)

      return {
        id: row.id,
        title: row.title,
        start: row.start_at,
        end: row.end_at,
        platforms,
      }
    })
    .filter((event) => {
      if (requestedPlatforms.length === 0) {
        return true
      }

      return event.platforms.some((platform) => requestedPlatforms.includes(platform.toLowerCase()))
    })
}
