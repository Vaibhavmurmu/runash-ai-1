import { NextRequest, NextResponse } from "next/server"
import { listStreamCalendarEvents, type StreamCalendarEvent } from "@/lib/repositories/stream-calendar-events"

type QueryParams = {
  start?: Date
  end?: Date
  workspace?: string
  platforms: string[]
  userId?: string
}

type StreamEventsDependencies = {
  listEvents: (filters: QueryParams) => Promise<StreamCalendarEvent[]>
}

function parseDateParam(value: string | null, key: string): Date | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${key} query parameter`)
  }

  return parsed
}

function parsePlatforms(value: string[]): string[] {
  return value
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

export function parseStreamEventsQuery(request: NextRequest): QueryParams {
  const searchParams = request.nextUrl.searchParams

  return {
    start: parseDateParam(searchParams.get("start"), "start"),
    end: parseDateParam(searchParams.get("end"), "end"),
    workspace: searchParams.get("workspace") ?? undefined,
    platforms: parsePlatforms(searchParams.getAll("platforms")),
    userId: searchParams.get("user") ?? undefined,
  }
}

function normalizeAndSortEvents(events: StreamCalendarEvent[]) {
  return events
    .map((event) => ({
      ...event,
      start: new Date(event.start).toISOString(),
      end: new Date(event.end).toISOString(),
    }))
    .sort((left, right) => {
      if (left.start === right.start) {
        return left.id.localeCompare(right.id)
      }

      return left.start.localeCompare(right.start)
    })
}

export async function handleStreamEventsGet(
  request: NextRequest,
  dependencies: StreamEventsDependencies = { listEvents: listStreamCalendarEvents },
) {
  try {
    const query = parseStreamEventsQuery(request)
    const events = await dependencies.listEvents(query)

    return NextResponse.json(normalizeAndSortEvents(events))
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to list stream events" },
      { status: 400 },
    )
  }
}
